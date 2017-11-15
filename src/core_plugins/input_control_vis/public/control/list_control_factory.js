import _ from 'lodash';
import { Control } from './control';
import { getTerms } from 'ui/terms/terms';
import { PhraseFilterManager } from './filter_manager/phrase_filter_manager';

const listControlDelimiter = '$$kbn_delimiter$$';

class ListControl extends Control {
  constructor(controlParams, filterManager, selectOptions) {
    super(controlParams, filterManager);

    this.selectOptions = selectOptions;
  }

  getMultiSelectDelimiter() {
    return this.filterManager.delimiter;
  }
}

export async function listControlFactory(controlParams, kbnApi) {
  const indexPattern = await kbnApi.indexPatterns.get(controlParams.indexPattern);
  const terms = await getTerms(indexPattern.fields.byName[controlParams.fieldName], '', _.get(controlParams, 'options.size', 5));

  return new ListControl(
    controlParams,
    new PhraseFilterManager(controlParams.id, controlParams.fieldName, indexPattern, kbnApi.queryFilter, listControlDelimiter),
    terms.map((term) => {
      return { label: term.toString(), value: term.toString() };
    })
  );
}
