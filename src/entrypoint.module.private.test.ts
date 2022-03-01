import { Commit, getCommits } from './entrypoint.module';
import { getDevAccessToken } from './test/private/getDevAccessToken';

describe('entrypoint.module', () => {
  describe('getCommits', () => {
    it('pullNumber', async () => {
      const accessToken = getDevAccessToken();
      const commits = await getCommits({
        accessToken: accessToken,
        repoName: 'kibana',
        repoOwner: 'elastic',
        pullNumber: 88188,
      });

      const expectedCommits: Commit[] = [
        {
          author: { name: 'Søren Louv-Jansen', email: 'sorenlouv@gmail.com' },
          sourceCommit: {
            committedDate: '2021-01-13T20:01:44Z',
            message:
              '[APM] Fix incorrect table column header (95th instead of avg) (#88188)',
            sha: 'd1b348e6213c5ad48653dfaad6eaf4928b2c688b',
          },
          sourcePullRequest: {
            number: 88188,
            url: 'https://github.com/elastic/kibana/pull/88188',
            mergeCommit: {
              message:
                '[APM] Fix incorrect table column header (95th instead of avg) (#88188)',
              sha: 'd1b348e6213c5ad48653dfaad6eaf4928b2c688b',
            },
          },
          sourceBranch: 'master',
          expectedTargetPullRequests: [
            {
              url: 'https://github.com/elastic/kibana/pull/88288',
              number: 88288,
              branch: '7.x',
              state: 'MERGED',
              mergeCommit: {
                sha: '52710be7add6811ec4783c7d383d4159c0aa76f5',
                message:
                  '[7.x] [APM] Fix incorrect table column header (95th instead of avg) (#88188) (#88288)\n\nCo-authored-by: Kibana Machine <42973632+kibanamachine@users.noreply.github.com>',
              },
            },
            {
              url: 'https://github.com/elastic/kibana/pull/88289',
              number: 88289,
              branch: '7.11',
              state: 'MERGED',
              mergeCommit: {
                sha: 'b8194e9ec27d69f485d8b194d1cb5e4f6d8fef6d',
                message:
                  '[APM] Fix incorrect table column header (95th instead of avg) (#88188) (#88289)',
              },
            },
          ],
        },
      ];
      expect(commits).toEqual(expectedCommits);
    });

    it('sha', async () => {
      const accessToken = getDevAccessToken();
      const commits = await getCommits({
        accessToken: accessToken,
        repoName: 'kibana',
        repoOwner: 'elastic',
        sha: 'd1b348e6213c5ad48653dfaad6eaf4928b2c688b',
      });

      const expectedCommits: Commit[] = [
        {
          author: { name: 'Søren Louv-Jansen', email: 'sorenlouv@gmail.com' },
          sourceCommit: {
            committedDate: '2021-01-13T20:01:44Z',
            message:
              '[APM] Fix incorrect table column header (95th instead of avg) (#88188)',
            sha: 'd1b348e6213c5ad48653dfaad6eaf4928b2c688b',
          },
          sourcePullRequest: {
            number: 88188,
            url: 'https://github.com/elastic/kibana/pull/88188',
            mergeCommit: {
              message:
                '[APM] Fix incorrect table column header (95th instead of avg) (#88188)',
              sha: 'd1b348e6213c5ad48653dfaad6eaf4928b2c688b',
            },
          },
          sourceBranch: 'master',
          expectedTargetPullRequests: [
            {
              url: 'https://github.com/elastic/kibana/pull/88288',
              number: 88288,
              branch: '7.x',
              state: 'MERGED',
              mergeCommit: {
                sha: '52710be7add6811ec4783c7d383d4159c0aa76f5',
                message:
                  '[7.x] [APM] Fix incorrect table column header (95th instead of avg) (#88188) (#88288)\n\nCo-authored-by: Kibana Machine <42973632+kibanamachine@users.noreply.github.com>',
              },
            },
            {
              url: 'https://github.com/elastic/kibana/pull/88289',
              number: 88289,
              branch: '7.11',
              state: 'MERGED',
              mergeCommit: {
                sha: 'b8194e9ec27d69f485d8b194d1cb5e4f6d8fef6d',
                message:
                  '[APM] Fix incorrect table column header (95th instead of avg) (#88188) (#88289)',
              },
            },
          ],
        },
      ];

      expect(commits).toEqual(expectedCommits);
    });

    it('prFilter', async () => {
      const accessToken = getDevAccessToken();
      const commits = await getCommits({
        accessToken: accessToken,
        repoName: 'kibana',
        repoOwner: 'elastic',
        prFilter: 'label:Team:apm merged:<2021-06-02 base:master',
        maxNumber: 3,
      });

      expect(commits).toMatchInlineSnapshot(`
        Array [
          Object {
            "author": Object {
              "email": "pierre.gayvallet@elastic.co",
              "name": "Pierre Gayvallet",
            },
            "expectedTargetPullRequests": Array [
              Object {
                "branch": "7.x",
                "mergeCommit": Object {
                  "message": "[7.x] Migrate most plugins to synchronous lifecycle (#89562) (#90579)

        * Migrate most plugins to synchronous lifecycle (#89562)

        * first pass

        * migrate more plugins

        * migrate yet more plugins

        * more oss plugins

        * fix test file

        * change Plugin signature on the client-side too

        * fix test types

        * migrate OSS client-side plugins

        * migrate OSS client-side test plugins

        * migrate xpack client-side plugins

        * revert fix attempt on fleet plugin

        * fix presentation start signature

        * fix yet another signature

        * add warnings for server-side async plugins in dev mode

        * remove unused import

        * fix isPromise

        * Add client-side deprecations

        * update migration examples

        * update generated doc

        * fix xpack unit tests

        * nit

        * (will be reverted) explicitly await for license to be ready in the auth hook

        * Revert \\"(will be reverted) explicitly await for license to be ready in the auth hook\\"

        This reverts commit fdf73feb

        * restore await on on promise contracts

        * Revert \\"(will be reverted) explicitly await for license to be ready in the auth hook\\"

        This reverts commit fdf73feb

        * Revert \\"restore await on on promise contracts\\"

        This reverts commit c5f2fe51

        * add delay before starting tests in FTR

        * update deprecation ts doc

        * add explicit contract for monitoring setup

        * migrate monitoring plugin to sync

        * change plugin timeout to 10sec

        * use delay instead of silence
        # Conflicts:
        #	x-pack/plugins/xpack_legacy/server/plugin.ts

        * fix mock",
                  "sha": "97f89e256b14dd01a4f20355dd04e8e27241c90a",
                },
                "number": 90579,
                "state": "MERGED",
                "url": "https://github.com/elastic/kibana/pull/90579",
              },
            ],
            "sourceBranch": "master",
            "sourceCommit": Object {
              "committedDate": "2021-02-08T09:19:54Z",
              "message": "Migrate most plugins to synchronous lifecycle (#89562)

        * first pass

        * migrate more plugins

        * migrate yet more plugins

        * more oss plugins

        * fix test file

        * change Plugin signature on the client-side too

        * fix test types

        * migrate OSS client-side plugins

        * migrate OSS client-side test plugins

        * migrate xpack client-side plugins

        * revert fix attempt on fleet plugin

        * fix presentation start signature

        * fix yet another signature

        * add warnings for server-side async plugins in dev mode

        * remove unused import

        * fix isPromise

        * Add client-side deprecations

        * update migration examples

        * update generated doc

        * fix xpack unit tests

        * nit

        * (will be reverted) explicitly await for license to be ready in the auth hook

        * Revert \\"(will be reverted) explicitly await for license to be ready in the auth hook\\"

        This reverts commit fdf73feb

        * restore await on on promise contracts

        * Revert \\"(will be reverted) explicitly await for license to be ready in the auth hook\\"

        This reverts commit fdf73feb

        * Revert \\"restore await on on promise contracts\\"

        This reverts commit c5f2fe51

        * add delay before starting tests in FTR

        * update deprecation ts doc

        * add explicit contract for monitoring setup

        * migrate monitoring plugin to sync

        * change plugin timeout to 10sec

        * use delay instead of silence",
              "sha": "3b3327dbc3c3041c9681e0cd86bd31cf411dc460",
            },
            "sourcePullRequest": Object {
              "mergeCommit": Object {
                "message": "Migrate most plugins to synchronous lifecycle (#89562)

        * first pass

        * migrate more plugins

        * migrate yet more plugins

        * more oss plugins

        * fix test file

        * change Plugin signature on the client-side too

        * fix test types

        * migrate OSS client-side plugins

        * migrate OSS client-side test plugins

        * migrate xpack client-side plugins

        * revert fix attempt on fleet plugin

        * fix presentation start signature

        * fix yet another signature

        * add warnings for server-side async plugins in dev mode

        * remove unused import

        * fix isPromise

        * Add client-side deprecations

        * update migration examples

        * update generated doc

        * fix xpack unit tests

        * nit

        * (will be reverted) explicitly await for license to be ready in the auth hook

        * Revert \\"(will be reverted) explicitly await for license to be ready in the auth hook\\"

        This reverts commit fdf73feb

        * restore await on on promise contracts

        * Revert \\"(will be reverted) explicitly await for license to be ready in the auth hook\\"

        This reverts commit fdf73feb

        * Revert \\"restore await on on promise contracts\\"

        This reverts commit c5f2fe51

        * add delay before starting tests in FTR

        * update deprecation ts doc

        * add explicit contract for monitoring setup

        * migrate monitoring plugin to sync

        * change plugin timeout to 10sec

        * use delay instead of silence",
                "sha": "3b3327dbc3c3041c9681e0cd86bd31cf411dc460",
              },
              "number": 89562,
              "url": "https://github.com/elastic/kibana/pull/89562",
            },
          },
          Object {
            "author": Object {
              "email": "w@tson.dk",
              "name": "Thomas Watson",
            },
            "expectedTargetPullRequests": Array [
              Object {
                "branch": "7.x",
                "mergeCommit": Object {
                  "message": "Upgrade to hapi version 20 (#85406) (#86592)",
                  "sha": "777c80d8a0f72be16091510d0cb5d09693ba6bb4",
                },
                "number": 86592,
                "state": "MERGED",
                "url": "https://github.com/elastic/kibana/pull/86592",
              },
            ],
            "sourceBranch": "master",
            "sourceCommit": Object {
              "committedDate": "2020-12-19T12:10:11Z",
              "message": "Upgrade to hapi version 20 (#85406)",
              "sha": "e8b21bc6c12cfd793c46e1d86577d5e5ec8a71f8",
            },
            "sourcePullRequest": Object {
              "mergeCommit": Object {
                "message": "Upgrade to hapi version 20 (#85406)",
                "sha": "e8b21bc6c12cfd793c46e1d86577d5e5ec8a71f8",
              },
              "number": 85406,
              "url": "https://github.com/elastic/kibana/pull/85406",
            },
          },
          Object {
            "author": Object {
              "email": "nathan.smith@elastic.co",
              "name": "Nathan L Smith",
            },
            "expectedTargetPullRequests": Array [
              Object {
                "branch": "7.x",
                "mergeCommit": Object {
                  "message": "Move EUI styled components integration to kibana_react (#86065) (#89217)

        ...from xpack_legacy.

        Remove the duplicated typings from the observability plugin and only use the ones from kibana_react.

        Fixes #78248.",
                  "sha": "57b798474ae5ec2892a06ffa5706c5dd405db137",
                },
                "number": 89217,
                "state": "MERGED",
                "url": "https://github.com/elastic/kibana/pull/89217",
              },
            ],
            "sourceBranch": "master",
            "sourceCommit": Object {
              "committedDate": "2021-01-25T19:48:35Z",
              "message": "Move EUI styled components integration to kibana_react (#86065)

        ...from xpack_legacy.

        Remove the duplicated typings from the observability plugin and only use the ones from kibana_react.

        Fixes #78248.",
              "sha": "e5588a129b1a0b2796822d4773176cc712dd5318",
            },
            "sourcePullRequest": Object {
              "mergeCommit": Object {
                "message": "Move EUI styled components integration to kibana_react (#86065)

        ...from xpack_legacy.

        Remove the duplicated typings from the observability plugin and only use the ones from kibana_react.

        Fixes #78248.",
                "sha": "e5588a129b1a0b2796822d4773176cc712dd5318",
              },
              "number": 86065,
              "url": "https://github.com/elastic/kibana/pull/86065",
            },
          },
        ]
      `);
    });

    it('author', async () => {
      const accessToken = getDevAccessToken();
      const commits = await getCommits({
        accessToken: accessToken,
        repoName: 'kibana',
        repoOwner: 'elastic',
        author: 'sqren',
        dateUntil: '2021-01-01T10:00:00Z',
        maxNumber: 3,
      });

      expect(commits).toMatchInlineSnapshot(`
        Array [
          Object {
            "author": Object {
              "email": "sorenlouv@gmail.com",
              "name": "Søren Louv-Jansen",
            },
            "expectedTargetPullRequests": Array [
              Object {
                "branch": "7.x",
                "mergeCommit": Object {
                  "message": "[APM] Fix broken link to ML when time range is not set (#85976) (#86227)

        Co-authored-by: Kibana Machine <42973632+kibanamachine@users.noreply.github.com>",
                  "sha": "2d361f018e0776c237d03b84ca8aa24615d16d99",
                },
                "number": 86227,
                "state": "MERGED",
                "url": "https://github.com/elastic/kibana/pull/86227",
              },
              Object {
                "branch": "7.11",
                "mergeCommit": Object {
                  "message": "[APM] Fix broken link to ML when time range is not set (#85976) (#86228)",
                  "sha": "c6c0015e01601cd852730d5cd20e1a906cbee900",
                },
                "number": 86228,
                "state": "MERGED",
                "url": "https://github.com/elastic/kibana/pull/86228",
              },
            ],
            "sourceBranch": "master",
            "sourceCommit": Object {
              "committedDate": "2020-12-16T15:17:03Z",
              "message": "[APM] Fix broken link to ML when time range is not set (#85976)",
              "sha": "744d6809ded7e1055bfda280c351cee3e8c0e3bf",
            },
            "sourcePullRequest": Object {
              "mergeCommit": Object {
                "message": "[APM] Fix broken link to ML when time range is not set (#85976)",
                "sha": "744d6809ded7e1055bfda280c351cee3e8c0e3bf",
              },
              "number": 85976,
              "url": "https://github.com/elastic/kibana/pull/85976",
            },
          },
          Object {
            "author": Object {
              "email": "sorenlouv@gmail.com",
              "name": "Søren Louv-Jansen",
            },
            "expectedTargetPullRequests": Array [
              Object {
                "branch": "7.x",
                "mergeCommit": Object {
                  "message": "[7.x] [APM] Correlations polish (#85116) (#85940)

        Co-authored-by: Kibana Machine <42973632+kibanamachine@users.noreply.github.com>",
                  "sha": "42b3ecb40c344cd57800b8fa387ae32bad24bfc4",
                },
                "number": 85940,
                "state": "MERGED",
                "url": "https://github.com/elastic/kibana/pull/85940",
              },
            ],
            "sourceBranch": "master",
            "sourceCommit": Object {
              "committedDate": "2020-12-15T12:15:00Z",
              "message": "[APM] Correlations polish (#85116)

        Co-authored-by: Kibana Machine <42973632+kibanamachine@users.noreply.github.com>",
              "sha": "20638a64e2a895d4e4a6597d4a37b5db7003f1e9",
            },
            "sourcePullRequest": Object {
              "mergeCommit": Object {
                "message": "[APM] Correlations polish (#85116)

        Co-authored-by: Kibana Machine <42973632+kibanamachine@users.noreply.github.com>",
                "sha": "20638a64e2a895d4e4a6597d4a37b5db7003f1e9",
              },
              "number": 85116,
              "url": "https://github.com/elastic/kibana/pull/85116",
            },
          },
          Object {
            "author": Object {
              "email": "sorenlouv@gmail.com",
              "name": "Søren Louv-Jansen",
            },
            "expectedTargetPullRequests": Array [
              Object {
                "branch": "7.x",
                "mergeCommit": Object {
                  "message": "[7.x] [APM] Improve pointer event hook (#85117) (#85142)",
                  "sha": "3b72a4f3cc7c0abd0541073e1d0246b85cea3def",
                },
                "number": 85142,
                "state": "MERGED",
                "url": "https://github.com/elastic/kibana/pull/85142",
              },
            ],
            "sourceBranch": "master",
            "sourceCommit": Object {
              "committedDate": "2020-12-07T14:43:58Z",
              "message": "[APM] Improve pointer event hook (#85117)",
              "sha": "cee681afb3c5f87371112fab9a7e5dddbafea0a8",
            },
            "sourcePullRequest": Object {
              "mergeCommit": Object {
                "message": "[APM] Improve pointer event hook (#85117)",
                "sha": "cee681afb3c5f87371112fab9a7e5dddbafea0a8",
              },
              "number": 85117,
              "url": "https://github.com/elastic/kibana/pull/85117",
            },
          },
        ]
      `);
    });

    it('throws when missing a filter', async () => {
      const accessToken = getDevAccessToken();
      await expect(() =>
        getCommits({
          accessToken: accessToken,
          repoName: 'kibana',
          repoOwner: 'elastic',
          maxNumber: 3,
        })
      ).rejects.toThrowError(
        'Must supply one of: `pullNumber`, `sha`, `prFilter` or `author`'
      );
    });
  });
});
