# failed tests reporter

A little CLI that runs in CI to find the failed tests in the JUnit reports, then create/update github issues for each failure.

## Test this script locally

To fetch some JUnit reports from a recent build on CI, visit its `Google Cloud Storage Upload Report` and execute the following in the JS Console:

```js
copy(`wget "${Array.from($$('a[href$=".xml"]')).filter(a => a.innerText === 'Download').map(a => a.href.replace('https://storage.cloud.google.com/', 'https://storage.googleapis.com/')).join('" "')}"`)
```

This copies a script to download the reports, which you should execute in the `test/junit` directory.

Next, run the CLI in `--dry-run` mode so that it doesn't actually communicate with Github.

```sh
node scripts/report_failed_tests.js --verbose --dry-run --build-url foo
```

If you specify the `GITHUB_TOKEN` environment variable then `--dry-run` will execute read operations but still won't execute write operations.