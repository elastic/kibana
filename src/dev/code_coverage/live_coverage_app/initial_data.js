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
    "url": "https://build-stats.elastic.co/app/kibana#/dashboard/02b9d310-9513-11e8-a9c0-db5f285c257f?_g=(refreshInterval%3A(pause%3A!f%2Cvalue%3A10000)%2Ctime%3A(from%3Anow%2Fd%2Cmode%3Aquick%2Cto%3Anow%2Fd))"
  },
  "historicalItems": [
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/250/2020-01-28T23-15-17Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/253/2020-01-29T17-49-40Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/254/2020-01-29T21-23-03Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/328/2020-02-18T19-37-58Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/329/2020-02-18T20-55-49Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/330/2020-02-18T21-34-34Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/331/2020-02-18T22-33-08Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/332/2020-02-19T03-26-32Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/334/2020-02-19T16-33-49Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/336/2020-02-19T22-30-58Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/339/2020-02-20T14-35-11Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/343/2020-02-20T22-16-00Z/",
    "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/350/2020-02-21T19-18-44Z/"
  ],
  "currentJobNumber": "334",
  "currentJobTimeStamp": "2020-01-28T23-15-17Z",
  "currentItem": "gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/334/2020-01-28T23-15-17Z/"
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
