import { i18n } from '@kbn/i18n';

export const OptionsListStrings = {
  summary: {
    getSeparator: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.summary.separator', {
        defaultMessage: ', ',
      }),
    getPlaceholder: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.summary.placeholder', {
        defaultMessage: 'Select...',
      }),
  },
  popover: {
    getLoadingMessage: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.popover.loading', {
        defaultMessage: 'Loading filters',
      }),
    getEmptyMessage: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.popover.empty', {
        defaultMessage: 'No filters found',
      }),
  },
};
