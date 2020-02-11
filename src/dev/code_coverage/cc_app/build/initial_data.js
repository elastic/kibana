const initialData = {
  "testRunnerTypes": [
    {
      "id": 1,
      "type": "jest"
    },
    {
      "id": 2,
      "type": "mocha"
    },
    {
      "id": 3,
      "type": "functional"
    }
  ],
  "buildStats": {
    "url": "\nhttps://build-stats.elastic.co/app/kibana#/dashboard/02b9d310-9513-11e8-a9c0-db5f285c257f?_g=\n(refreshInterval%3A(pause%3A!f%2Cvalue%3A10000)%2Ctime%3A(from%3Anow%2Fd%2Cmode%3Aquick%2Cto%3Anow%2Fd))\n"
  },
  "historicalItems": [
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/250/2020-01-28T23-15-17Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/253/2020-01-29T17-49-40Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/254/2020-01-29T21-23-03Z/"
  ],
  "currentJobNumber": "123"
};

if (!isInBrowser()) {
  module.exports.default = {}
  module.exports.default = initialData
} else {
  window.initialData = initialData;
}

function isInBrowser() {
  return !!(typeof window !== 'undefined');
}
