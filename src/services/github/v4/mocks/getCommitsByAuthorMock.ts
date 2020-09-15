import { DataResponse } from '../fetchCommitsByAuthor';

export const getCommitsByAuthorMock = (repoName: string): DataResponse => ({
  repository: {
    ref: {
      target: {
        history: {
          edges: [
            {
              node: {
                oid: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
                message:
                  'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
                associatedPullRequests: {
                  edges: [
                    {
                      node: {
                        baseRefName: 'master',
                        labels: {
                          nodes: [{ name: 'my-label-a' }],
                        },
                        mergeCommit: {
                          oid: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
                          message:
                            'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
                        },
                        repository: {
                          name: repoName,
                          owner: {
                            login: 'elastic',
                          },
                        },
                        number: 80,
                        timelineItems: {
                          edges: [
                            {
                              node: {
                                source: {
                                  __typename: 'PullRequest',
                                  number: 99,
                                  title: 'some title',
                                  state: 'MERGED',
                                  baseRefName: '6.3',
                                  commits: {
                                    edges: [
                                      {
                                        node: {
                                          commit: {
                                            message:
                                              'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
                                          },
                                        },
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },
  },
});
