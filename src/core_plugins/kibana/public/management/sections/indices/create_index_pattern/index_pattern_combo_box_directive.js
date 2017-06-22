import 'ngreact';

import {
  IndexPatternComboBox,
} from './index_pattern_combo_box';

import { uiModules } from 'ui/modules';

const app = uiModules.get('app/kibana', ['react']);

app.directive('indexPatternComboBox', function (reactDirective) {
  return reactDirective(IndexPatternComboBox);
});
