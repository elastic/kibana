import React from 'react';
import { VisualizeConstants } from '../visualize_constants';

import { PromptForItems } from 'ui_framework/components';

export function VisualizeItemPrompt() {
  return <PromptForItems
    singularType={VisualizeConstants.SAVED_VIS_TYPE}
    pluralType={VisualizeConstants.SAVED_VIS_TYPE_PLURAL}
    addHref={'#' + VisualizeConstants.WIZARD_STEP_1_PAGE_PATH}/>;
}
