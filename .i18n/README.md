# i18n temporary Translations

```
npx formatjs extract 'src/**/*.{js,jsx,ts,tsx}' --throws --ignore='**/node_modules/**' --ignore='**/__tests__/**' --ignore='**/dist/**' --ignore='**/target/**' --ignore='**/vendor/**' --ignore='**/build/**' --ignore='**/*.test.{js,jsx,ts,tsx}' --ignore='**/*.d.ts' --additional-function-names='i18n.translate' --out-file='en.json' --extract-source-location

npx formatjs compile en.json --out-file consumable.json



npx formatjs extract 'src/plugins/home/server/tutorials/instructions/functionbeat_instructions.ts' --throws --additional-function-names='translate' --out-file='en.json'

```