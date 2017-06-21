import { get, pick, omit, keys } from 'lodash';

export function determineEnabledScriptingLangs(callDataAsKibanaUser) {
  return callDataAsKibanaUser('cluster.getSettings', {
    include_defaults: true,
    filter_path: '**.script.engine.*.inline'
  })
  .then((esResponse) => {
    const langs = get(esResponse, 'defaults.script.engine', {});
    const inlineLangs = pick(langs, lang => lang.inline === 'true');
    const supportedLangs = omit(inlineLangs, 'mustache');
    return keys(supportedLangs);
  });
}
