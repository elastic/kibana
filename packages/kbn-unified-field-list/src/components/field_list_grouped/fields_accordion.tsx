/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiNotificationBadge,
  EuiSpacer,
  EuiAccordion,
  EuiLoadingSpinner,
  EuiIconTip,
} from '@elastic/eui';
import classNames from 'classnames';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { type FieldListItem, FieldsGroupNames, type RenderFieldItemParams } from '../../types';
import './fields_accordion.scss';

export interface FieldsAccordionProps<T extends FieldListItem> {
  initialIsOpen: boolean;
  onToggle: (open: boolean) => void;
  id: string;
  label: string;
  helpTooltip?: string;
  hasLoaded: boolean;
  fieldsCount: number;
  hideDetails?: boolean;
  isFiltered: boolean;
  groupIndex: number;
  groupName: FieldsGroupNames;
  fieldSearchHighlight?: string;
  paginatedFields: T[];
  renderFieldItem: (params: RenderFieldItemParams<T>) => JSX.Element;
  renderCallout: () => JSX.Element;
  showExistenceFetchError?: boolean;
  showExistenceFetchTimeout?: boolean;
}

function InnerFieldsAccordion<T extends FieldListItem = DataViewField>({
  initialIsOpen,
  onToggle,
  id,
  label,
  helpTooltip,
  hasLoaded,
  fieldsCount,
  hideDetails,
  isFiltered,
  groupIndex,
  groupName,
  fieldSearchHighlight,
  paginatedFields,
  renderFieldItem,
  renderCallout,
  showExistenceFetchError,
  showExistenceFetchTimeout,
}: FieldsAccordionProps<T>) {
  const renderButton = useMemo(() => {
    const titleClassname = classNames({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      unifiedFieldList__fieldsAccordion__titleTooltip: !!helpTooltip,
    });

    return (
      <EuiText size="xs">
        <strong className={titleClassname}>{label}</strong>
        {!!helpTooltip && (
          <EuiIconTip
            aria-label={helpTooltip}
            type="questionInCircle"
            color="subdued"
            size="s"
            position="right"
            content={helpTooltip}
            iconProps={{
              className: 'eui-alignTop',
            }}
          />
        )}
      </EuiText>
    );
  }, [label, helpTooltip]);

  const extraAction = useMemo(() => {
    if (showExistenceFetchError) {
      return (
        <EuiIconTip
          aria-label={i18n.translate('unifiedFieldList.fieldsAccordion.existenceErrorAriaLabel', {
            defaultMessage: 'Existence fetch failed',
          })}
          type="warning"
          color="warning"
          content={i18n.translate('unifiedFieldList.fieldsAccordion.existenceErrorLabel', {
            defaultMessage: "Field information can't be loaded",
          })}
          iconProps={{
            'data-test-subj': `${id}-fetchWarning`,
          }}
        />
      );
    }
    if (showExistenceFetchTimeout) {
      return (
        <EuiIconTip
          aria-label={i18n.translate('unifiedFieldList.fieldsAccordion.existenceTimeoutAriaLabel', {
            defaultMessage: 'Existence fetch timed out',
          })}
          type="clock"
          color="warning"
          content={i18n.translate('unifiedFieldList.fieldsAccordion.existenceTimeoutLabel', {
            defaultMessage: 'Field information took too long',
          })}
        />
      );
    }
    if (hasLoaded) {
      return (
        <EuiNotificationBadge
          size="m"
          color={isFiltered ? 'accent' : 'subdued'}
          data-test-subj={`${id}-count`}
        >
          {fieldsCount}
        </EuiNotificationBadge>
      );
    }

    return <EuiLoadingSpinner size="m" data-test-subj={`${id}-countLoading`} />;
  }, [showExistenceFetchError, showExistenceFetchTimeout, hasLoaded, isFiltered, id, fieldsCount]);

  return (
    <EuiAccordion
      initialIsOpen={initialIsOpen}
      onToggle={onToggle}
      data-test-subj={id}
      id={id}
      buttonContent={renderButton}
      extraAction={extraAction}
    >
      <EuiSpacer size="s" />
      {hasLoaded &&
        (!!fieldsCount ? (
          <ul>
            {paginatedFields &&
              paginatedFields.map((field, index) => (
                <Fragment key={getFieldKey(field)}>
                  {renderFieldItem({
                    field,
                    itemIndex: index,
                    groupIndex,
                    groupName,
                    hideDetails,
                    fieldSearchHighlight,
                  })}
                </Fragment>
              ))}
          </ul>
        ) : (
          renderCallout()
        ))}
    </EuiAccordion>
  );
}

export const FieldsAccordion = React.memo(InnerFieldsAccordion) as typeof InnerFieldsAccordion;

export const getFieldKey = (field: FieldListItem): string =>
  `${field.name}-${field.displayName}-${field.type}`;
