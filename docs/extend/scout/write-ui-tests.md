---
navigation_title: Write UI tests
---

# Write Scout UI tests [scout-write-ui-tests]

This guide reviews a real-world UI test using Scout.

:::::{warning}
We assume you have [set up your plugin or package](./setup-plugin.md) to work with Scout.
:::::

## A real-world example [scout-write-ui-tests-example]

This example is adapted from an APM UI test:

- `https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/test/scout/ui/parallel_tests/settings/anomaly_detection.spec.ts`

```ts
import { expect } from '@kbn/scout-oblt/ui'; <1>
import { test } from '../fixtures';

test.describe('APM Anomaly Detection', () => {
  test('Viewer should not be able to modify settings', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsViewer(); <2>
    await pageObjects.anomalyDetectionPage.goto(); <3>

    const createButton = pageObjects.anomalyDetectionPage.getCreateJobButtonLocator();
    await expect(createButton).toBeDisabled(); <4>
  });

  test('apmAllPrivilegesWithoutWriteSettings can create ML jobs but not modify settings', async ({
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsApmAllPrivilegesWithoutWriteSettings(); <5>
    await pageObjects.anomalyDetectionPage.goto();

    await expect(pageObjects.anomalyDetectionPage.getCreateJobButtonLocator()).toBeEnabled(); <6>

    await test.step('verify create button functionality', async () => { <7>
      await pageObjects.anomalyDetectionPage.createMlJobs('production');
    });

    await test.step('verify delete button functionality', async () => {
      await pageObjects.anomalyDetectionPage.deleteMlJob();
    });
  });
});
```

1. Import from `@kbn/scout` or a solution-specific Scout package.
2. Log into Kibana with the `viewer` role using `browserAuth`.
3. Navigate using page objects (`pageObjects` fixture).
4. Verify the viewer role cannot access privileged actions.
5. Use a custom role with specific APM privileges (defined by that plugin’s fixtures).
6. Verify functionality is enabled for users with appropriate privileges.
7. Use `test.step` to group multi-step flows for readable output and reports.

## Save the test file [scout-write-ui-tests-save]

UI tests should be saved under:

- `<plugin-root>/test/scout/ui/tests` (sequential tests), or
- `<plugin-root>/test/scout/ui/parallel_tests` (parallel tests)

File names must end with `.spec.ts`.

## Next steps [scout-write-ui-tests-next]

- [Browser authentication](./browser-auth.md)
- [Fixtures](./fixtures.md)
- [Page objects](./page-objects.md)
- [Write API tests](./write-api-tests.md)
- [Run tests](./run-tests.md) and [debugging](./debugging.md)

