module.exports = {
  overrides: [
    {
      plugins: [
        '@kbn/eslint-plugin-eslint',
      ],
      files: [
        'src/core/{server,common,public}/index.ts',
        '{src,x-pack}/plugins/**/{server,common,public}/index.ts'
      ],
      rules: {
        '@kbn/eslint/no_export_all': 'error',
        '@kbn/eslint/no_duplicate_exports': 'error',
      },
    }
  ]
}
