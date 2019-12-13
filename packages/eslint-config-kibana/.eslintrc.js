const Path = require('path')

const { REPO_ROOT } = require('@kbn/dev-utils')

module.exports = {
  extends: [
    './javascript.js',
    './typescript.js',
    './jest.js',
    './react.js',
  ],

  plugins: [
    'import',
    '@kbn/eslint-plugin-eslint'
  ],

  settings: {
    'import/resolver': {
      '@kbn/eslint-import-resolver-kibana': {
        forceNode: true,
      },
    },
  },

  parserOptions: {
    ecmaVersion: 2018
  },

  env: {
    es6: true,
  },

  rules: {
    '@kbn/eslint/module_migration': [
      'error',
      /**
       * define the current migration types to execute
       *
       * `rename` rename imports for one module to another
       *   from: the name of the module to replace in imports
       *   to: the new name of the module to use
       *
       * `disallow` prevent imports of a specific module, direct users to do something else
       *   name: the name of the module to disallow
       *   error: error message to show to users, describe what users should do instead
       *
       * `relativeToNamed` rewrite relative imports from outside `directory` into
       *  directory, using `../../../directory/*` format, to use `name/*` instead
       *  only applies to `import`/`export` and relative imports from outside of directory
       *   directory: *absolute path* to the directory to find relative imports into
       *   name: the named import that should be used instead of relative imports to directory
       */
      [
        {
          rename: {
            from: 'expect.js',
            to: '@kbn/expect',
          }
        },
        {
          disallow: {
            name: 'mkdirp',
            error: `Don't use 'mkdirp', use the new { recursive: true } option of Fs.mkdir instead`
          },
        },
        {
          relativeToNamed: {
            name: 'src',
            directory: Path.resolve(REPO_ROOT, 'src'),
          },
        },
        {
          disallow: {
            name: '@kbn/elastic-idx',
            error: `Don't use idx(), use optional chaining syntax instead https://ela.st/optchain`
          }
        },
        {
          relativeToNamed: {
            name: 'x-pack',
            directory: Path.resolve(REPO_ROOT, 'x-pack'),
          }
        },
        {
          rename: {
            from: 'react-router',
            to: 'react-router-dom',
          }
        },
      ],
    ],
  }
};
