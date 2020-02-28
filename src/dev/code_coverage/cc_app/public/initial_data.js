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
    "gs://elastic-bekitzur-kibana-coverage-live/jobs/elastic+kibana+code-coverage/364/2020-02-24T15:23:52Z/",
    "gs://elastic-bekitzur-kibana-coverage-live/jobs/elastic+kibana+code-coverage/365/2020-02-24T18:48:56Z/",
    "gs://elastic-bekitzur-kibana-coverage-live/jobs/elastic+kibana+code-coverage/367/2020-02-24T21:29:48Z/"
  ],
  "currentJobNumber": "334",
  "currentJobTimeStamp": "2020-01-28T23-15-17Z",
  "currentItem": "gs://elastic-bekitzur-kibana-coverage-live/jobs/elastic+kibana+code-coverage/334/2020-01-28T23-15-17Z/"
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
