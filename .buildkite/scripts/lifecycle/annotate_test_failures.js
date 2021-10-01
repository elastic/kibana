const { TestFailures } = require('kibana-buildkite-library');

(async () => {
  try {
    await TestFailures.annotateTestFailures();
  } catch (ex) {
    console.error('Annotate test failures error', ex.message);
    if (ex.response) {
      console.error('HTTP Error Response Status', ex.response.status);
      console.error('HTTP Error Response Body', ex.response.data);
    }
    process.exit(1);
  }
})();
