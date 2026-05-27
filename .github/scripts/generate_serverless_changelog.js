const GITHUB_OWNER = 'elastic';
const KIBANA_REPO = 'kibana';
const SERVERLESS_GITOPS_REPO = 'serverless-gitops';
const VERSIONS_FILE_PATH = 'services/kibana/versions.yaml';

const requiredEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const findServerlessGitOpsCommits = async ({ github, envSearch, repo, filePath }) => {
  const commitsToFind = 5;
  const matchingCommits = [];

  for await (const response of github.paginate.iterator(github.rest.repos.listCommits, {
    owner: GITHUB_OWNER,
    repo,
    path: filePath,
    per_page: 100,
  })) {
    for (const commit of response.data) {
      if (commit.commit.message.includes(envSearch)) {
        matchingCommits.push(commit);
        if (matchingCommits.length === commitsToFind) {
          return matchingCommits;
        }
      }
    }
  }

  return matchingCommits;
};

const findKibanaServerlessDeployedCommit = async ({
  github,
  gitOpsSha,
  envSearch,
  repo,
  filePath,
}) => {
  try {
    const fileResponse = await github.rest.repos.getContent({
      owner: GITHUB_OWNER,
      repo,
      path: filePath,
      ref: gitOpsSha,
    });

    if (!('content' in fileResponse.data)) {
      throw new Error(`File content not available for commit ${gitOpsSha}`);
    }

    const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');
    const regex = new RegExp(`${envSearch}:\\s+"([a-f0-9]{7,40})"`);
    const match = content.match(regex);

    if (!match || !match[1]) {
      throw new Error(`Could not find ${envSearch} in ${filePath} for commit ${gitOpsSha}`);
    }

    return { gitOpsSha, kibanaSha: match[1] };
  } catch (error) {
    throw new Error(`Error extracting deployed SHA from commit ${gitOpsSha}: ${error}`);
  }
};

const matchKibanaTagsToReleaseCommits = async ({ github, serverlessReleases }) => {
  const tagsByReleaseSha = new Map();

  for await (const response of github.paginate.iterator(github.rest.repos.listTags, {
    owner: GITHUB_OWNER,
    repo: KIBANA_REPO,
    per_page: 100,
  })) {
    for (const tag of response.data) {
      const release = serverlessReleases.find(({ kibanaSha }) => tag.commit.sha.startsWith(kibanaSha));

      if (release) {
        tagsByReleaseSha.set(release.kibanaSha, tag);
      }
    }

    if (tagsByReleaseSha.size === serverlessReleases.length) {
      break;
    }
  }

  return serverlessReleases.flatMap((release) => {
    const tagForReleaseCommit = tagsByReleaseSha.get(release.kibanaSha);

    if (!tagForReleaseCommit) {
      console.warn(`No tag found for the release commit ${release.kibanaSha}, removing.`);
      return [];
    }

    return [
      {
        ...release,
        releaseTag: tagForReleaseCommit,
        releaseDate: new Date(Number(tagForReleaseCommit.name.split('@')[1]) * 1000),
      },
    ];
  });
};

const getServerlessReleases = async ({ github, envSearch }) => {
  const matchingCommits = await findServerlessGitOpsCommits({
    github,
    envSearch,
    repo: SERVERLESS_GITOPS_REPO,
    filePath: VERSIONS_FILE_PATH,
  });

  if (matchingCommits.length === 0) {
    throw new Error(`Could not find matching commits for ${envSearch} in serverless-gitops repo`);
  }

  const deployedShaPromises = matchingCommits.map((commit) =>
    findKibanaServerlessDeployedCommit({
      github,
      gitOpsSha: commit.sha,
      envSearch,
      repo: SERVERLESS_GITOPS_REPO,
      filePath: VERSIONS_FILE_PATH,
    })
  );

  const serverlessReleases = await Promise.all(deployedShaPromises);

  return matchKibanaTagsToReleaseCommits({ github, serverlessReleases });
};

const getPrsForServerless = async ({
  github,
  serverlessReleases,
  selectedServerlessSHAs,
}) => {
  if (selectedServerlessSHAs.size !== 2) {
    throw new Error('Exactly two serverless releases must be selected');
  }

  const [newer, older] = Array.from(selectedServerlessSHAs)
    .map((sha) => {
      return serverlessReleases.find(({ kibanaSha }) => kibanaSha === sha);
    })
    .sort((a, b) => {
      if (a?.releaseDate && b?.releaseDate) {
        return Number(b.releaseDate) - Number(a.releaseDate);
      }

      return 0;
    });

  const serverlessReleaseDate = new Date(Number(newer?.releaseTag?.name.split('@')[1]) * 1000);
  console.log(`Serverless release date: ${serverlessReleaseDate.toISOString()}`);

  // Get all the merge commits between the two releases.
  const compareResult = await github.paginate(github.rest.repos.compareCommitsWithBasehead, {
    owner: GITHUB_OWNER,
    repo: KIBANA_REPO,
    basehead: `${older?.kibanaSha}...${newer?.kibanaSha}`,
    per_page: 250,
  });

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
            }
          }
        }
      }
    }
  `;

  const chunks = chunk(commitNodeIds, 20);
  const results = await Promise.all(
    chunks.map((commitNodeIdChunk) => {
      const variables = {
        commitNodeIds: commitNodeIdChunk,
      };

      return github.graphql(query, variables);
    })
  );

  const pullRequests = results.flatMap((result) => {
    return result.nodes.flatMap((node) => node?.associatedPullRequests?.nodes ?? []).filter(Boolean);
  });

  return pullRequests.map((pr) => {
    return {
      ...pr,
      user: pr.author,
      html_url: pr.url,
    };
  });
};

const selectReleases = ({ releases, serviceVersion }) => {
  const sortedReleases = [...releases].sort((a, b) => {
    if (a?.releaseDate && b?.releaseDate) {
      const releaseDateDiff = Number(b.releaseDate) - Number(a.releaseDate);

      if (releaseDateDiff !== 0) {
        return releaseDateDiff;
      }
    }

    // Release dates are based on the Unix timestamp in the tag name, so a deploy-fix can have the same date as a new release.
    return (a.releaseTag?.name ?? '').localeCompare(b.releaseTag?.name ?? '');
  });

  const currentReleaseIndex = sortedReleases.findIndex(({ kibanaSha }) => kibanaSha === serviceVersion);

  if (currentReleaseIndex === -1) {
    throw new Error(`Could not find ${serviceVersion} in recent serverless releases`);
  }

  const previousRelease = sortedReleases[currentReleaseIndex + 1];

  if (!previousRelease) {
    throw new Error(`Could not find the previous serverless release before ${serviceVersion}`);
  }

  return {
    newer: sortedReleases[currentReleaseIndex],
    older: previousRelease,
  };
};

const generateServerlessChangelog = async ({ github }) => {
  const serviceVersion = requiredEnv('SERVICE_VERSION');
  const targetEnv = requiredEnv('TARGET_ENV');

  console.log(`Generating serverless changelog for ${targetEnv}`);
  console.log(`Current service version: ${serviceVersion}`);

  if (process.env.BUILDKITE_BUILD_URL) {
    console.log(`Triggered by Buildkite build: ${process.env.BUILDKITE_BUILD_URL}`);
  }

  const releases = await getServerlessReleases({ github, envSearch: targetEnv });
  const { newer, older } = selectReleases({ releases, serviceVersion });

  console.log(`Previous service version: ${older.kibanaSha}`);

  const prs = await getPrsForServerless({
    github,
    serverlessReleases: releases,
    selectedServerlessSHAs: new Set([newer.kibanaSha, older.kibanaSha]),
  });

  console.log(prs.map(({ html_url: htmlUrl }) => htmlUrl).sort().join('\n'));
};

module.exports = generateServerlessChangelog;
