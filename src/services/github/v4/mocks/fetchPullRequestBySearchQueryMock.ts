import { DataResponse } from '../fetchPullRequestBySearchQuery';

export const fetchPullRequestBySearchQueryMock: DataResponse = {
  search: {
    nodes: [
      {
        number: 76492,
        repository: {
          name: 'kibana',
          owner: {
            login: 'elastic',
          },
        },
        mergeCommit: {
          oid: 'e0f4775b780aada005bdd1774edcceac0ffee006',
          message:
            '[APM] @ts-error -> @ts-expect-error (#76492)\n\nCo-authored-by: Elastic Machine <elasticmachine@users.noreply.github.com>',
        },
        labels: {
          nodes: [
            {
              name: 'Team:apm',
            },
            {
              name: 'release_note:skip',
            },
            {
              name: 'v7.10.0',
            },
          ],
        },
        baseRefName: 'master',
        timelineItems: {
          edges: [
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  title: '[7.x] [APM] @ts-error -> @ts-expect-error (#76492)',
                  state: 'MERGED',
                  number: 99,
                  baseRefName: '7.x',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] @ts-error -> @ts-expect-error (#76492)\n\nCo-authored-by: Elastic Machine <elasticmachine@users.noreply.github.com>',
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
      {
        number: 76638,
        repository: {
          name: 'kibana',
          owner: {
            login: 'elastic',
          },
        },
        mergeCommit: {
          oid: 'fae1e02e0f7a475bf92da05be52a817aa2a84959',
          message:
            '[APM] Avoid negative offset for error marker on timeline (#76638)\n\nCo-authored-by: Elastic Machine <elasticmachine@users.noreply.github.com>',
        },
        labels: {
          nodes: [
            {
              name: 'Team:apm',
            },
            {
              name: 'release_note:fix',
            },
            {
              name: 'v7.10.0',
            },
          ],
        },
        baseRefName: 'master',
        timelineItems: {
          edges: [
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  title:
                    '[7.x] [APM] Avoid negative offset for error marker on timeline (#76638)',
                  state: 'MERGED',
                  number: 99,
                  baseRefName: '7.x',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Avoid negative offset for error marker on timeline (#76638)\n\nCo-authored-by: Elastic Machine <elasticmachine@users.noreply.github.com>',
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
      {
        number: 73120,
        repository: {
          name: 'kibana',
          owner: {
            login: 'elastic',
          },
        },
        mergeCommit: {
          oid: 'aa68e3b63a4b513294dc58eaf4422e66a0beffb1',
          message:
            '[APM] Add anomaly detection API tests + fixes (#73120)\n\nCo-authored-by: Nathan L Smith <nathan.smith@elastic.co>',
        },
        labels: {
          nodes: [
            {
              name: 'Team:apm',
            },
            {
              name: 'release_note:skip',
            },
            {
              name: 'v7.10.0',
            },
            {
              name: 'v7.9.0',
            },
          ],
        },
        baseRefName: 'master',
        timelineItems: {
          edges: [
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  title:
                    '[7.x] [APM] Add anomaly detection API tests + fixes (#73120)',
                  state: 'MERGED',
                  baseRefName: '7.x',
                  number: 99,
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Add anomaly detection API tests + fixes (#73120)\n\nCo-authored-by: Nathan L Smith <nathan.smith@elastic.co>',
                          },
                        },
                      },
                      {
                        node: {
                          commit: {
                            message: 'i18n fixes',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title:
                    '[7.9] [APM] Add anomaly detection API tests + fixes (#73120)',
                  state: 'MERGED',
                  baseRefName: '7.9',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Add anomaly detection API tests + fixes (#73120)\n\nCo-authored-by: Nathan L Smith <nathan.smith@elastic.co>\n# Conflicts:\n#\tx-pack/plugins/apm/public/components/app/Settings/anomaly_detection/jobs_list.tsx',
                          },
                        },
                      },
                      {
                        node: {
                          commit: {
                            message: 'i18n fix',
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
      {
        number: 72599,
        repository: {
          name: 'kibana',
          owner: {
            login: 'elastic',
          },
        },
        mergeCommit: {
          oid: '2fc7112ec27a9f8ded0e2f9e097613721f1179dd',
          message:
            '[APM] Update script with new roles/users (#72599)\n\n* [APM] Update script with new roles/users\r\n\r\n* add log\r\n\r\n* Add validation for http prefix',
        },
        labels: {
          nodes: [
            {
              name: 'Team:apm',
            },
            {
              name: 'backport:skip',
            },
            {
              name: 'release_note:skip',
            },
            {
              name: 'v8.0.0',
            },
          ],
        },
        baseRefName: 'master',
        timelineItems: {
          edges: [],
        },
      },
      {
        number: 72797,
        repository: {
          name: 'kibana',
          owner: {
            login: 'elastic',
          },
        },
        mergeCommit: {
          oid: '7e126bfab6a3bfc44f9fa50feecfe22b4634e1a0',
          message: 'Update jobs_list.tsx (#72797)',
        },
        labels: {
          nodes: [
            {
              name: 'Team:apm',
            },
            {
              name: 'release_note:skip',
            },
            {
              name: 'v7.10.0',
            },
            {
              name: 'v7.9.0',
            },
          ],
        },
        baseRefName: 'master',
        timelineItems: {
          edges: [
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title: '[7.x] Update jobs_list.tsx (#72797)',
                  state: 'MERGED',
                  baseRefName: '7.x',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message: 'Update jobs_list.tsx (#72797)',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title: '[7.9] Update jobs_list.tsx (#72797)',
                  state: 'MERGED',
                  baseRefName: '7.9',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message: 'Update jobs_list.tsx (#72797)',
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
      {
        number: 69143,
        repository: {
          name: 'kibana',
          owner: {
            login: 'elastic',
          },
        },
        mergeCommit: {
          oid: 'd12208c7ea9513529ea1aff42d154db89e3573ff',
          message: '[APM] Fix confusing request/minute viz (#69143)',
        },
        labels: {
          nodes: [
            {
              name: 'Team:apm',
            },
            {
              name: 'apm-test-plan-7.9.0',
            },
            {
              name: 'apm-test-plan-done',
            },
            {
              name: 'release_note:enhancement',
            },
            {
              name: 'v7.9.0',
            },
          ],
        },
        baseRefName: 'master',
        timelineItems: {
          edges: [
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title:
                    '[7.x] [APM] Fix confusing request/minute viz (#69143)',
                  state: 'MERGED',
                  baseRefName: '7.x',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Fix confusing request/minute viz (#69143)',
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
      {
        number: 71655,
        repository: {
          name: 'kibana',
          owner: {
            login: 'elastic',
          },
        },
        mergeCommit: {
          oid: 'f760d8513b0216a73e9a476661f0fb8fb0887a61',
          message: '[APM] Remove watcher integration (#71655)',
        },
        labels: {
          nodes: [
            {
              name: 'Team:apm',
            },
            {
              name: 'apm-test-plan-7.9.0',
            },
            {
              name: 'apm-test-plan-done',
            },
            {
              name: 'release_note:deprecation',
            },
            {
              name: 'v7.9.0',
            },
          ],
        },
        baseRefName: 'master',
        timelineItems: {
          edges: [
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title: '[7.x] [APM] Remove watcher integration (#71655)',
                  state: 'MERGED',
                  baseRefName: '7.x',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Remove watcher integration (#71655)\n\n# Conflicts:\n#\tx-pack/plugins/apm/public/components/app/ServiceDetails/ServiceIntegrations/__test__/esResponse.ts',
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
      {
        number: 72614,
        repository: {
          name: 'kibana',
          owner: {
            login: 'elastic',
          },
        },
        mergeCommit: {
          oid: '05ee3da80db34ccf93e7424aa2704c098a1b49fa',
          message: '[APM] Disable flaky rum e2e’s (#72614)',
        },
        labels: {
          nodes: [
            {
              name: 'Team:apm',
            },
            {
              name: 'release_note:skip',
            },
            {
              name: 'v7.10.0',
            },
            {
              name: 'v7.9.0',
            },
          ],
        },
        baseRefName: 'master',
        timelineItems: {
          edges: [
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title: '[7.x] [APM] Disable flaky rum e2e’s (#72614)',
                  state: 'MERGED',
                  baseRefName: '7.x',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message: '[APM] Disable flaky rum e2e’s (#72614)',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title: '[7.9] [APM] Disable flaky rum e2e’s (#72614)',
                  state: 'MERGED',
                  baseRefName: '7.9',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message: '[APM] Disable flaky rum e2e’s (#72614)',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'Issue',
                },
              },
            },
          ],
        },
      },
      {
        number: 71661,
        repository: {
          name: 'kibana',
          owner: {
            login: 'elastic',
          },
        },
        mergeCommit: {
          oid: '51a862988c344b34bd9da57dd57008df12e1b5e5',
          message:
            '[APM] Increase `xpack.apm.ui.transactionGroupBucketSize` (#71661)',
        },
        labels: {
          nodes: [
            {
              name: 'Team:apm',
            },
            {
              name: 'apm-test-plan-7.9.0',
            },
            {
              name: 'apm-test-plan-done',
            },
            {
              name: 'release_note:skip',
            },
            {
              name: 'v7.9.0',
            },
          ],
        },
        baseRefName: 'master',
        timelineItems: {
          edges: [
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title:
                    '[APM] Increase `xpack.apm.ui.transactionGroupBucketSize`',
                  state: 'CLOSED',
                  baseRefName: 'master',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Increase `xpack.apm.ui.transactionGroupBucketSize`',
                          },
                        },
                      },
                      {
                        node: {
                          commit: {
                            message: 'Hardcode top traces to 10000 buckets',
                          },
                        },
                      },
                      {
                        node: {
                          commit: {
                            message:
                              "Merge branch 'master' into increase-transactionGroupBucketSize",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title:
                    '[7.x] [APM] Increase `xpack.apm.ui.transactionGroupBucketSize` (#71661)',
                  state: 'CLOSED',
                  baseRefName: '7.x',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Increase `xpack.apm.ui.transactionGroupBucketSize` (#71661)',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title:
                    '[7.x] [APM] Increase `xpack.apm.ui.transactionGroupBucketSize` (#71661)',
                  state: 'MERGED',
                  baseRefName: '7.x',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Increase `xpack.apm.ui.transactionGroupBucketSize` (#71661)',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title:
                    '[7.9] [APM] Increase `xpack.apm.ui.transactionGroupBucketSize` (#71661)',
                  state: 'MERGED',
                  baseRefName: '7.9',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Increase `xpack.apm.ui.transactionGroupBucketSize` (#71661)',
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
      {
        number: 72316,
        repository: {
          name: 'kibana',
          owner: {
            login: 'elastic',
          },
        },
        mergeCommit: {
          oid: '511e4543a7828cf0cdb157b88b01352947e0384f',
          message:
            '[APM] Handle ML errors (#72316)\n\n* [APM] Handle ML errors\r\n\r\n* Add capability check\r\n\r\n* Improve test\r\n\r\n* Address Caue’s feedback\r\n\r\n* Move getSeverity\r\n\r\n* Fix tsc\r\n\r\n* Fix copy',
        },
        labels: {
          nodes: [
            {
              name: 'Team:apm',
            },
            {
              name: 'release_note:skip',
            },
            {
              name: 'v7.10.0',
            },
            {
              name: 'v7.9.0',
            },
          ],
        },
        baseRefName: 'master',
        timelineItems: {
          edges: [
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title: '[7.9] [APM] Handle ML errors (#72316)',
                  state: 'MERGED',
                  baseRefName: '7.9',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Handle ML errors (#72316)\n\n* [APM] Handle ML errors\r\n\r\n* Add capability check\r\n\r\n* Improve test\r\n\r\n* Address Caue’s feedback\r\n\r\n* Move getSeverity\r\n\r\n* Fix tsc\r\n\r\n* Fix copy',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title: '[7.x] [APM] Handle ML errors (#72316)',
                  state: 'MERGED',
                  baseRefName: '7.x',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Handle ML errors (#72316)\n\n* [APM] Handle ML errors\r\n\r\n* Add capability check\r\n\r\n* Improve test\r\n\r\n* Address Caue’s feedback\r\n\r\n* Move getSeverity\r\n\r\n* Fix tsc\r\n\r\n* Fix copy',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title: '[7.x] [APM] Handle ML errors (#72316)',
                  state: 'CLOSED',
                  baseRefName: '7.x',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Handle ML errors (#72316)\n\n* [APM] Handle ML errors\r\n\r\n* Add capability check\r\n\r\n* Improve test\r\n\r\n* Address Caue’s feedback\r\n\r\n* Move getSeverity\r\n\r\n* Fix tsc\r\n\r\n* Fix copy',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title: '[7.9] [APM] Handle ML errors (#72316)',
                  state: 'CLOSED',
                  baseRefName: '7.9',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Handle ML errors (#72316)\n\n* [APM] Handle ML errors\r\n\r\n* Add capability check\r\n\r\n* Improve test\r\n\r\n* Address Caue’s feedback\r\n\r\n* Move getSeverity\r\n\r\n* Fix tsc\r\n\r\n* Fix copy',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title: '[7.x] [APM] Handle ML errors (#72316)',
                  state: 'CLOSED',
                  baseRefName: '7.x',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              '[APM] Handle ML errors (#72316)\n\n* [APM] Handle ML errors\r\n\r\n* Add capability check\r\n\r\n* Improve test\r\n\r\n* Address Caue’s feedback\r\n\r\n* Move getSeverity\r\n\r\n* Fix tsc\r\n\r\n* Fix copy',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  number: 99,
                  title:
                    '[APM] Fixes error when loading APM without ML read permissions',
                  state: 'CLOSED',
                  baseRefName: 'master',
                  commits: {
                    edges: [
                      {
                        node: {
                          commit: {
                            message:
                              'Fixes error when loading APM with an APM ready-only user.',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              node: {
                source: {
                  __typename: 'Issue',
                },
              },
            },
          ],
        },
      },
    ],
  },
};
