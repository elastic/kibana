const initialData = {
  testRunnerTypes: [
    {
      id: 1,
      type: 'jest',
    },
    {
      id: 2,
      type: 'mocha',
    },
    {
      id: 3,
      type: 'functional',
    },
  ],
  buildStats: {
    url: `https://build-stats.elastic.co/app/kibana#/dashboard/02b9d310-9513-11e8-a9c0-db5f285c257f?_g=(refreshInterval%3A(pause%3A!f%2Cvalue%3A10000)%2Ctime%3A(from%3Anow%2Fd%2Cmode%3Aquick%2Cto%3Anow%2Fd))`,
  },
  historicalItems: [],
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
