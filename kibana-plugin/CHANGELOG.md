# 8.0.0

- Bump @elastic/plugin-helpers to ^8.0.1, a bracking change required for [changes in kibana](https://github.com/elastic/kibana/pull/13806)

# 7.2.4

- Bump  `kibana-plugin-helpers`, to work with some recent changes in Kibana
- Bump kibana eslint config and associated peer dependencies
- Adds eslint to the template

# 7.2.3

- Chore: upgrade `kibana-plugin-helpers`, which will allow plugins to handle [changes to the kibana babel build script](https://github.com/elastic/kibana/pull/13973)
- Fix: update readme to remove the step of installing the template globally, since sao will pull it off npm automatically

# 7.2.2

- Fix some typos in the readme, prompts, and resulting files

# 7.2.1

- Ship with working tests by default

# 7.2.0

- Add `kibana.templateVersion` to output `package.json`
- Add `gather-info` script to generated output
- Add compat info to the readme

# 7.1.0

- Add Kibana eslint config and resolver
- Fix deprecated setting in sao config
- Bump dependency versions
- Replace chai with expect.js to better track Kibana modules

# 7.0.1

- Fix version in `package.json` when using `master` as your version

# 7.0.0

- Requires Kibana v5.5.0 or higher
- Fixed use of `ui/modules` in the template

# 6.2.2

- Replace chai with expect.js to better track Kibana modules
- Add compat info to the readme

# 6.2.1

- Forked from https://github.com/elastic/generator-kibana-plugin
- Should target Kibana ^5.0.0, up to 5.4.x