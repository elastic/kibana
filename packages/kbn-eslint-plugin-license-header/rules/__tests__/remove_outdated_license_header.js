const { RuleTester } = require('eslint');
const rule = require('../remove_outdated_license_header');
const dedent = require('dedent');

const RULE_NAME = '@kbn/license-header/remove-outdated-license-header';

const ruleTester = new RuleTester({
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2015
  }
});
ruleTester.run(RULE_NAME, rule, {
  valid: [
    {
      code: dedent`
        /* license */

        console.log('foo')
      `,

      options: [{
        licenses: [
          '// license'
        ]
      }],
    },
    {
      code: dedent`
        // license

        console.log('foo')
      `,

      options: [{
        licenses: [
          '/* license */',
        ]
      }],
    }
  ],

  invalid: [
    // missing license option
    {
      code: dedent`
        console.log('foo')
      `,

      options: [],
      errors: [
        {
          message: '"licenses" option is required',
        }
      ]
    },

    // license cannot contain multiple block comments
    {
      code: dedent`
        console.log('foo')
      `,

      options: [{
        licenses: [
          '/* one *//* two */'
        ]
      }],
      errors: [
        {
          message: '"licenses[0]" option must only include a single comment',
        }
      ]
    },

    // license cannot contain multiple line comments
    {
      code: dedent`
        console.log('foo')
      `,

      options: [{
        licenses: [
          `// one\n// two`
        ]
      }],
      errors: [
        {
          message: '"licenses[0]" option must only include a single comment',
        }
      ]
    },

    // license cannot contain expressions
    {
      code: dedent`
        console.log('foo')
      `,

      options: [{
        licenses: [
          '// old license',
          dedent`
            /* license */
            console.log('hello world');
          `
        ]
      }],
      errors: [
        {
          message: '"licenses[1]" option must only include a single comment',
        }
      ]
    },

    // license is not a single comment
    {
      code: dedent`
        console.log('foo')
      `,

      options: [{
        licenses: [
          '// old license',
          '// older license',
          `console.log('hello world');`
        ]
      }],
      errors: [
        {
          message: '"licenses[2]" option must only include a single comment',
        }
      ]
    },
  ]
});
