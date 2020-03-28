export const getExistingBackportPRsMock = (repoName: string) => ({
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
