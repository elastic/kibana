/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiCode } from '@elastic/eui';
import { RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';

export const DataControlEditorStrings = {
  manageControl: {
    getFlyoutCreateTitle: (showESQLOnly: boolean) =>
      showESQLOnly
        ? i18n.translate('controls.controlGroup.manageControl.createESQLFlyoutTitle', {
            defaultMessage: 'Create ES|QL control',
          })
        : i18n.translate('controls.controlGroup.manageControl.createFlyoutTitle', {
            defaultMessage: 'Create control',
          }),
    getFlyoutEditTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.editFlyoutTitle', {
        defaultMessage: 'Edit control',
      }),
    getConfigureInputTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.valuesSourceTitle', {
        defaultMessage: 'Values source',
      }),
    getConfigureOutputTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.configureOutputTitle', {
        defaultMessage: 'Configure output',
      }),
    getConfigureControlTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.configureControlTitle', {
        defaultMessage: 'Configure control',
      }),
    dataSource: {
      getSelectDataViewMessage: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.selectDataViewMessage', {
          defaultMessage: 'Please select a data view',
        }),
      getDataViewTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.dataViewTitle', {
          defaultMessage: 'Data view',
        }),
      getDataViewListErrorTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.dataViewListErrorTitle', {
          defaultMessage: 'Error loading data views',
        }),
      getFieldTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.fieldTitle', {
          defaultMessage: 'Field',
        }),
      getFieldListErrorTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.fieldListErrorTitle', {
          defaultMessage: 'Error loading the field list',
        }),
      getControlTypeTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.controlTypesTitle', {
          defaultMessage: 'Control type',
        }),
      getControlTypeErrorMessage: ({
        fieldSelected,
        controlType,
        isESQLOutputMode,
        isStaticValuesSource,
      }: {
        fieldSelected?: boolean;
        controlType?: string;
        isESQLOutputMode?: boolean;
        isStaticValuesSource?: boolean;
      }) => {
        if (!fieldSelected) {
          return i18n.translate(
            'controls.controlGroup.manageControl.dataSource.controlTypErrorMessage.noField',
            {
              defaultMessage: 'Select a field first.',
            }
          );
        }

        if (isStaticValuesSource) {
          return i18n.translate(
            'controls.controlGroup.manageControl.dataSource.controlTypErrorMessage.notStaticCompatible',
            {
              defaultMessage: 'This control type cannot display static values.',
            }
          );
        }

        if (isESQLOutputMode) {
          return i18n.translate(
            'controls.controlGroup.manageControl.dataSource.controlTypErrorMessage.notESQLCompatible',
            {
              defaultMessage: 'This control type cannot output an ES|QL variable.',
            }
          );
        }

        switch (controlType) {
          /**
           * Note that options list controls are currently compatible with every field type; so, there is no
           * need to have a special error message for these.
           */
          case RANGE_SLIDER_CONTROL: {
            return i18n.translate(
              'controls.controlGroup.manageControl.dataSource.controlTypeErrorMessage.rangeSlider',
              {
                defaultMessage: 'Range sliders are only compatible with number fields.',
              }
            );
          }
          default: {
            /** This shouldn't ever happen - but, adding just in case as a fallback. */
            return i18n.translate(
              'controls.controlGroup.manageControl.dataSource.controlTypeErrorMessage.default',
              {
                defaultMessage: 'Select a compatible control type.',
              }
            );
          }
        }
      },
      getEsqlQueryTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.esqlQueryTitle', {
          defaultMessage: 'ES|QL query',
        }),
      getListOptionsTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.listOptionsTitle', {
          defaultMessage: 'List options',
        }),
      valuesPreview: {
        getTitle: () =>
          i18n.translate('controls.controlGroup.manageControl.dataSource.valuesPreview.title', {
            defaultMessage: 'Values preview',
          }),
        getRunQueryButton: () =>
          i18n.translate(
            'controls.controlGroup.manageControl.dataSource.valuesPreview.runQueryButton',
            {
              defaultMessage: 'Run query',
            }
          ),
        getRetryButton: () =>
          i18n.translate(
            'controls.controlGroup.manageControl.dataSource.valuesPreview.retryButton',
            {
              defaultMessage: 'Retry',
            }
          ),
        getEmptyText: () =>
          i18n.translate('controls.controlGroup.manageControl.dataSource.valuesPreview.emptyText', {
            defaultMessage: 'Run the query to get a preview of possible values.',
          }),
        getErrorTitle: () =>
          i18n.translate(
            'controls.controlGroup.manageControl.dataSource.valuesPreview.errorTitle',
            {
              defaultMessage: 'Error getting values preview',
            }
          ),
        getMultiColumnErrorTitle: () =>
          i18n.translate(
            'controls.controlGroup.manageControl.dataSource.valuesPreview.multiColumnErrorTitle',
            {
              defaultMessage: 'Query must return a single column',
            }
          ),
        getMultiColumnErrorBody: (totalColumns: number) => (
          <FormattedMessage
            id="controls.controlGroup.manageControl.dataSource.valuesPreview.multiColumnErrorBody"
            defaultMessage="Your query is currently returning {totalColumns} columns. Choose a column, or use {boldStatsBy} to narrow your query down."
            values={{
              totalColumns,
              boldStatsBy: <strong>STATS BY</strong>,
            }}
          />
        ),
        getSelectAColumnText: () =>
          i18n.translate(
            'controls.controlGroup.manageControl.dataSource.valuesPreview.selectAColumnText',
            {
              defaultMessage: 'Select a column',
            }
          ),
        getMinText: () =>
          i18n.translate('controls.controlGroup.manageControl.dataSource.valuesPreview.minText', {
            defaultMessage: 'Minimum value',
          }),
        getMaxText: () =>
          i18n.translate('controls.controlGroup.manageControl.dataSource.valuesPreview.maxText', {
            defaultMessage: 'Maximum value',
          }),
        getMismatchedFieldWarning: (esqlField: string, dslField: string) => (
          <FormattedMessage
            id="controls.controlGroup.manageControl.dataSource.valuesPreview.mismatchedFieldWarning"
            defaultMessage="This query seems to be returning values that match the field {esqlField}, but your control is configured to filter the field {dslField}. Make sure this is intentional before saving."
            values={{
              esqlField: <strong>{esqlField}</strong>,
              dslField: <strong>{dslField}</strong>,
            }}
          />
        ),
      },
    },
    displaySettings: {
      getTitleInputTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.displaySettings.titleInputTitle', {
          defaultMessage: 'Label',
        }),
      getTitleInputOptionalText: () =>
        i18n.translate(
          'controls.controlGroup.manageControl.displaySettings.titleInputOptionalText',
          {
            defaultMessage: 'Optional',
          }
        ),
      getWidthInputTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.displaySettings.widthInputTitle', {
          defaultMessage: 'Minimum width',
        }),
      getGrowSwitchTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.displaySettings.growSwitchTitle', {
          defaultMessage: 'Expand width to fit available space',
        }),
    },
    controlTypeSettings: {
      getFormGroupTitle: (type: string) =>
        i18n.translate('controls.controlGroup.manageControl.controlTypeSettings.formGroupTitle', {
          defaultMessage: '{controlType} settings',
          values: { controlType: type },
        }),
      getFormGroupDescription: (type: string) =>
        i18n.translate(
          'controls.controlGroup.manageControl.controlTypeSettings.formGroupDescription',
          {
            defaultMessage: 'Custom settings for your {controlType} control.',
            values: { controlType: type.toLocaleLowerCase() },
          }
        ),
    },
    getSaveChangesTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.saveChangesTitle', {
        defaultMessage: 'Save',
      }),
    getCancelTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.cancelTitle', {
        defaultMessage: 'Cancel',
      }),
    getDeleteButtonTitle: () =>
      i18n.translate('controls.controlGroup.management.delete', {
        defaultMessage: 'Delete control',
      }),
    fieldOutput: {
      getFieldOutputDescription: (fieldName?: string, isStaticValuesSource?: boolean) =>
        fieldName ? (
          <FormattedMessage
            id="controls.controlGroup.manageControl.fieldOutput.fieldOutputDescription"
            defaultMessage="Filter will be created against the field {fieldName}."
            values={{
              fieldName: <strong>{fieldName}</strong>,
            }}
          />
        ) : isStaticValuesSource ? (
          i18n.translate(
            'controls.controlGroup.manageControl.fieldOutput.fieldOutputDescriptionStaticNoSelectedField',
            {
              defaultMessage: 'Choose a field to create a filter.',
            }
          )
        ) : (
          i18n.translate(
            'controls.controlGroup.manageControl.fieldOutput.fieldOutputDescriptionESQLNoSelectedField',
            {
              defaultMessage:
                'Run the query below to try to auto-detect a field, or choose one manually.',
            }
          )
        ),
      getSelectFieldTitle: (hasField: boolean) =>
        hasField
          ? i18n.translate('controls.controlGroup.manageControl.fieldOutput.changeFieldTitle', {
              defaultMessage: 'Change',
            })
          : i18n.translate('controls.controlGroup.manageControl.fieldOutput.selectFieldTitle', {
              defaultMessage: 'Select',
            }),
    },
    esqlOutput: {
      getInvalidPrefixError: () =>
        i18n.translate('controls.controlGroup.manageControl.esqlOutput.invalidPrefixError', {
          defaultMessage: '?? prefix can only be used with Static values',
        }),
      getInvalidCharactersError: () =>
        i18n.translate('controls.controlGroup.manageControl.esqlOutput.invalidCharsError', {
          defaultMessage: 'Invalid characters in variable name',
        }),
      getVariableNameInUseError: () =>
        i18n.translate('controls.controlGroup.manageControl.esqlOutput.nameInUseError', {
          defaultMessage: 'Variable name already in use',
        }),
      getEsqlVariableHelpText: (isStaticValuesSource: boolean) => {
        if (isStaticValuesSource)
          return (
            <FormattedMessage
              id="controls.controlGroup.manageControl.esqlOutput.variableHelpTextStaticInput"
              defaultMessage="Start your variable name with {valuesPrefix} to replace {valuesBold} or with {fieldsPrefix} to replace {fieldsBold} or {functionsBold}."
              values={{
                valuesPrefix: <EuiCode>?</EuiCode>,
                fieldsPrefix: <EuiCode>??</EuiCode>,
                valuesBold: (
                  <strong>
                    {i18n.translate('controls.controlGroup.manageControl.esqlOutput.valuesText', {
                      defaultMessage: 'values',
                    })}
                  </strong>
                ),
                fieldsBold: (
                  <strong>
                    {i18n.translate('controls.controlGroup.manageControl.esqlOutput.fieldsTexst', {
                      defaultMessage: 'fields',
                    })}
                  </strong>
                ),
                functionsBold: (
                  <strong>
                    {i18n.translate(
                      'controls.controlGroup.manageControl.esqlOutput.functionsText',
                      {
                        defaultMessage: 'functions',
                      }
                    )}
                  </strong>
                ),
              }}
            />
          );
        else
          return (
            <FormattedMessage
              id="controls.controlGroup.manageControl.esqlOutput.variableHelpTextDynamicInput"
              defaultMessage="Start your variable name with {valuesPrefix} to replace {valuesBold}. To use {fieldsPrefix} to replace {fieldsBold} or {functionsBold}, change your control input to {staticValuesBold}."
              values={{
                // i18n_check requires repeating all of this stuff
                valuesPrefix: <EuiCode>?</EuiCode>,
                fieldsPrefix: <EuiCode>??</EuiCode>,
                valuesBold: (
                  <strong>
                    {i18n.translate('controls.controlGroup.manageControl.esqlOutput.valuesText', {
                      defaultMessage: 'values',
                    })}
                  </strong>
                ),
                fieldsBold: (
                  <strong>
                    {i18n.translate('controls.controlGroup.manageControl.esqlOutput.fieldsTexst', {
                      defaultMessage: 'fields',
                    })}
                  </strong>
                ),
                functionsBold: (
                  <strong>
                    {i18n.translate(
                      'controls.controlGroup.manageControl.esqlOutput.functionsText',
                      {
                        defaultMessage: 'functions',
                      }
                    )}
                  </strong>
                ),
                staticValuesBold: (
                  <strong>
                    {i18n.translate(
                      'controls.controlGroup.manageControl.esqlOutput.staticValuesText',
                      {
                        defaultMessage: 'Static values',
                      }
                    )}
                  </strong>
                ),
              }}
            />
          );
      },
    },
  },
  management: {
    controlWidth: {
      getWidthSwitchLegend: () =>
        i18n.translate('controls.controlGroup.management.layout.controlWidthLegend', {
          defaultMessage: 'Change control size',
        }),
    },
  },
};
