module.exports = {
  extends: [
    './javascript.js',
    './typescript.js',
    './jest.js',
  ],
  plugins: ['@kbn/eslint-plugin-eslint'],

  parserOptions: {
    ecmaVersion: 2018
  },

  env: {
    es6: true,
  },

  rules: {
    '@kbn/eslint/module_migration': [
      'error',
      [
        {
          from: 'expect.js',
          to: '@kbn/expect',
        },
        {
          from: 'x-pack',
          toRelative: 'x-pack',
        },
        {
          from: 'boom',
          to: '@hapi/boom',
        },
        {
          from: 'good-squeeze',
          to: '@hapi/good-squeeze',
        },
        {
          from: 'h2o2',
          to: '@hapi/h2o2',
        },
        {
          from: 'hapi',
          to: '@hapi/hapi',
        },
        {
          from: 'hapi-auth-cookie',
          to: '@hapi/cookie',
        },
        {
          from: 'hoek',
          to: '@hapi/hoek',
        },
        {
          from: 'joi',
          toRelative: '@hapi/joi',
        },
        {
          from: 'inert',
          to: '@hapi/inert',
        },
        {
          from: 'oppsy',
          to: '@hapi/oppsy',
        },
        {
          from: 'podium',
          to: '@hapi/podium',
        },
        {
          from: 'vision',
          to: '@hapi/vision',
        }
      ],
    ],
  }
};
