export const fetchPullRequestBySearchQueryMock = {
  data: {
    search: {
      nodes: [
        {
          number: 58727,
          labels: {
            nodes: [
              {
                name: 'Team:apm',
              },
              {
                name: 'release_note:fix',
              },
              {
                name: 'v7.6.1',
              },
            ],
          },
          mergeCommit: {
            oid: 'd474ccf244d22b8abf7df1be3e96b36b715281f1',
            message:
              '[APM] Fix timeout in APM setup (#58727)\n\n* [APM] Fix timeout in APM setup\r\n\r\n* Update plugin.ts',
          },
        },
        {
          number: 58467,
          labels: {
            nodes: [
              {
                name: 'Team:apm',
              },
              {
                name: 'release_note:skip',
              },
              {
                name: 'v7.7.0',
              },
            ],
          },
          mergeCommit: {
            oid: '0e0f114d03f0becb9bbc5b93cbed217f2663efbd',
            message: '[APM] Improve debug output (#58467)',
          },
        },
        {
          number: 53541,
          labels: {
            nodes: [
              {
                name: 'Team:apm',
              },
              {
                name: 'apm-test-plan-7.6.0',
              },
              {
                name: 'apm-test-plan-done',
              },
              {
                name: 'release_note:skip',
              },
              {
                name: 'v7.6.0',
              },
            ],
          },
          mergeCommit: {
            oid: '8b0d5f54dd701f0f5a9b36d2a8a1a27cffbdb6e3',
            message:
              '[APM] Fix missing apm indicies (#53541)\n\n* [APM] Fix missing apm indicies\r\n\r\n* Fix infinite loop in ui indices\r\n\r\n* Add test for empty settings',
          },
        },
        {
          number: 52262,
          labels: {
            nodes: [
              {
                name: 'Team:apm',
              },
              {
                name: 'apm-test-plan-7.6.0',
              },
              {
                name: 'apm-test-plan-done',
              },
              {
                name: 'release_note:fix',
              },
              {
                name: 'v7.5.1',
              },
              {
                name: 'v7.6.0',
              },
            ],
          },
          mergeCommit: {
            oid: '47dcf87e791c14c853172972232eaabebd8f609d',
            message:
              '[APM] Quick fix for ACM to ensure more than 10 items are displayed (#52262)\n\n* [APM] Quick fix for ACM to ensure more than 10 items are displayed\r\n\r\n* Fix snapshot',
          },
        },
        {
          number: 53775,
          labels: {
            nodes: [
              {
                name: 'Team:apm',
              },
              {
                name: 'release_note:skip',
              },
              {
                name: 'v8.0.0',
              },
            ],
          },
          mergeCommit: {
            oid: '53513f6b7b85f1140352a99f65ff53f5cdb1ec79',
            message:
              '[APM] Add log statements for flaky test (#53775)\n\n* [APM] Add log statements for flaky test\r\n\r\n* Improve logging\r\n\r\n* Improve logging\r\n\r\n* Log full index on error',
          },
        },
        {
          number: 52149,
          labels: {
            nodes: [
              {
                name: 'Team:apm',
              },
              {
                name: 'release_note:skip',
              },
              {
                name: 'v7.6.0',
              },
            ],
          },
          mergeCommit: {
            oid: '085a2af8ec3771c80ea2aeb8e592fd7c4c18c259',
            message: '[APM] Fix failing ACM integration test (#52149)',
          },
        },
        {
          number: 52162,
          labels: {
            nodes: [
              {
                name: 'Team:apm',
              },
              {
                name: 'release_note:skip',
              },
              {
                name: 'v8.0.0',
              },
            ],
          },
          mergeCommit: {
            oid: 'b9e2895f2258da4b01f96ac2000514ef01f47379',
            message: '[APM] Add support for basepath (#52162)',
          },
        },
        {
          number: 50127,
          labels: {
            nodes: [
              {
                name: 'Team:apm',
              },
              {
                name: 'release_note:skip',
              },
              {
                name: 'technical debt',
              },
              {
                name: 'v7.6.0',
              },
            ],
          },
          mergeCommit: {
            oid: '551b03b215e8c399d7ae6cac404d9d49f17c45d4',
            message:
              '[APM] Improve index pattern handling (#50127)\n\n* [APM] Improve index pattern handling\r\n\r\nHandle exceptions\r\n\r\nExtract index pattern id as constant\r\n\r\nCatch error when dynamic index pattern cannot be fetched\r\n\r\nUse req instead of request\r\n\r\n* [APM] Address feedback\r\n\r\n* Check for data before creating index pattern\r\n\r\n* Add test\r\n\r\n* Created ProcessorEvent as enum\r\n\r\n* Revert ProcessorEvent back to type',
          },
        },
        {
          number: 48404,
          labels: {
            nodes: [
              {
                name: 'Team:apm',
              },
              {
                name: 'release_note:skip',
              },
              {
                name: 'v7.6.0',
              },
            ],
          },
          mergeCommit: {
            oid: '77247773b9cdcfc2257713f1df2a49e1c31d7066',
            message: '[APM] Remove `type` from agent configuration (#48404)',
          },
        },
        {
          number: 44093,
          labels: {
            nodes: [
              {
                name: 'Team:apm',
              },
              {
                name: '[zube]: Done',
              },
              {
                name: 'apm-test-plan-7.4.0',
              },
              {
                name: 'release_note:enhancement',
              },
              {
                name: 'v7.4.0',
              },
            ],
          },
          mergeCommit: {
            oid: '4657f0b041bd4a05102c18889121db252f23bf07',
            message:
              '[APM] Show loading state on waterfall and avoid re-fetching distribution chart when changing bucket (#44093)',
          },
        },
      ],
    },
  },
};
