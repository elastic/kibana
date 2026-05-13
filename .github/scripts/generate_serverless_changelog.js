const GITHUB_OWNER = 'elastic';
const KIBANA_REPO = 'kibana';
const SERVERLESS_GITOPS_REPO = 'serverless-gitops';
const VERSIONS_FILE_PATH = 'services/kibana/versions.yaml';
const COMMITS_TO_FIND = 5;
const GITHUB_API_VERSION = '2022-11-28';

const requiredEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const githubRequest = async ({ path, method = 'GET', query = {}, body }) => {
  const url = new URL(`https://api.github.com${path}`);

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${requiredEnv('GITHUB_TOKEN')}`,
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${method} ${url} ${response.status} ${text}`);
  }

  return {
    data: text ? JSON.parse(text) : undefined,
    link: response.headers.get('link'),
  };
};

const findServerlessGitOpsCommits = async ({ envSearch, repo, filePath }) => {
  const matchingCommits = [];
  let page = 1;

  while (matchingCommits.length < COMMITS_TO_FIND) {
    const { data: commits } = await githubRequest({
      path: `/repos/${GITHUB_OWNER}/${repo}/commits`,
      query: {
        path: filePath,
        per_page: '100',
        page: String(page),
      },
    });

    if (commits.length === 0) {
      break;
    }

    for (const commit of commits) {
      if (commit.commit.message.includes(envSearch)) {
        matchingCommits.push(commit);
        if (matchingCommits.length === COMMITS_TO_FIND) {
          return matchingCommits;
        }
      }
    }

    page += 1;
  }

  return matchingCommits;
};

const findKibanaServerlessDeployedCommit = async ({ gitOpsSha, envSearch, repo, filePath }) => {
  try {
    const { data } = await githubRequest({
      path: `/repos/${GITHUB_OWNER}/${repo}/contents/${filePath}`,
      query: {
        ref: gitOpsSha,
      },
    });

    if (!data.content) {
      throw new Error(`File content not available for commit ${gitOpsSha}`);
    }

    const content = Buffer.from(data.content, 'base64').toString('utf8');
    const regex = new RegExp(`${escapeRegExp(envSearch)}:\\s+"([a-f0-9]{7,40})"`);
    const match = content.match(regex);

    if (!match || !match[1]) {
      throw new Error(`Could not find ${envSearch} in ${filePath} for commit ${gitOpsSha}`);
    }

    return { gitOpsSha, kibanaSha: match[1] };
  } catch (error) {
    throw new Error(`Error extracting deployed SHA from commit ${gitOpsSha}: ${error}`);
  }
};

const getServerlessReleases = async ({ envSearch }) => {
  const matchingCommits = await findServerlessGitOpsCommits({
    envSearch,
    repo: SERVERLESS_GITOPS_REPO,
    filePath: VERSIONS_FILE_PATH,
  });

  if (matchingCommits.length === 0) {
    throw new Error(`Could not find matching commits for ${envSearch} in serverless-gitops repo`);
  }

  return Promise.all(
    matchingCommits.map((commit) =>
      findKibanaServerlessDeployedCommit({
        gitOpsSha: commit.sha,
        envSearch,
        repo: SERVERLESS_GITOPS_REPO,
        filePath: VERSIONS_FILE_PATH,
      })
    )
  );
};

const getCompareResults = async ({ older, newer }) => {
  const compareResults = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const { data, link } = await githubRequest({
      path: `/repos/${GITHUB_OWNER}/${KIBANA_REPO}/compare/${older.kibanaSha}...${newer.kibanaSha}`,
      query: {
        per_page: '250',
        page: String(page),
      },
    });

    compareResults.push(data);
    hasNextPage = Boolean(link?.includes('rel="next"'));
    page += 1;
  }

  return compareResults;
};

const getPrsForServerless = async ({ older, newer, excludedLabels = [], includedLabels = [] }) => {
  const compareResult = await getCompareResults({ older, newer });

  const commitNodeIds = compareResult.reduce((acc, results) => {
    return acc.concat(results.commits.map((commit) => commit.node_id));
  }, []);

  const query = `
    query($commitNodeIds: [ID!]!) {
      nodes(ids: $commitNodeIds) {
        ... on Commit {
          associatedPullRequests(first: 1) {
            nodes {
              id
              url
              title
              number
              body
              author {
                login
              }
              labels(first: 50) {
                nodes {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const pullRequests = [];
  const chunks = chunk(commitNodeIds, 20);
  const results = await Promise.all(
    chunks.map(async (commitNodeIdChunk) => {
      const { data: response } = await githubRequest({
        path: '/graphql',
        method: 'POST',
        body: {
          query,
          variables: {
            commitNodeIds: commitNodeIdChunk,
          },
        },
      });

      if (response.errors) {
        throw new Error(`GitHub GraphQL request failed: ${JSON.stringify(response.errors)}`);
      }

      return response.data;
    })
  );

  results.forEach((result) => {
    result.nodes.forEach((node) => {
      if (node?.associatedPullRequests) {
        node.associatedPullRequests.nodes?.forEach((pr) => {
          if (pr?.labels?.nodes) {
            const prLabels = pr.labels.nodes.map((label) => label.name);
            const hasExcludedLabel = prLabels.some((label) => excludedLabels.includes(label));
            const hasIncludedLabel =
              includedLabels.length === 0 ||
              prLabels.some((label) => includedLabels.includes(label));

            if (!hasExcludedLabel && hasIncludedLabel) {
              pullRequests.push(pr);
            }
          }
        });
      }
    });
  });

  const prs = pullRequests.map((pr) => {
    return {
      ...pr,
      labels: pr.labels?.nodes ?? [],
      user: pr.author,
      html_url: pr.url,
    };
  });

  return Array.from(new Map(prs.map((pr) => [pr.html_url, pr])).values());
};

const selectReleases = ({ releases, serviceVersion }) => {
  const currentReleaseIndex = releases.findIndex(({ kibanaSha }) => kibanaSha === serviceVersion);

  if (currentReleaseIndex === -1) {
    throw new Error(`Could not find ${serviceVersion} in recent serverless releases`);
  }

  const previousRelease = releases[currentReleaseIndex + 1];

  if (!previousRelease) {
    throw new Error(`Could not find the previous serverless release before ${serviceVersion}`);
  }

  return {
    newer: releases[currentReleaseIndex],
    older: previousRelease,
  };
};

const main = async () => {
  const serviceVersion = requiredEnv('SERVICE_VERSION');
  const targetEnv = requiredEnv('TARGET_ENV');

  console.log(`Generating serverless changelog for ${targetEnv}`);
  console.log(`Current service version: ${serviceVersion}`);

  if (process.env.BUILDKITE_BUILD_URL) {
    console.log(`Triggered by Buildkite build: ${process.env.BUILDKITE_BUILD_URL}`);
  }

  const releases = await getServerlessReleases({ envSearch: targetEnv });
  const { newer, older } = selectReleases({ releases, serviceVersion });

  console.log(`Previous service version: ${older.kibanaSha}`);

  const prs = await getPrsForServerless({ older, newer });

  console.log(prs.map(({ html_url: htmlUrl }) => htmlUrl).join('\n'));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
