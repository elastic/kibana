/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useMemo } from 'react';
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
import './fields_accordion.scss';

export interface FieldsAccordionProps {
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
  paginatedFields: DataViewField[];
  renderFieldItem: (params: {
    field: DataViewField;
    hideDetails?: boolean;
    itemIndex: number;
    groupIndex: number;
  }) => JSX.Element;
  renderCallout: () => JSX.Element;
  showExistenceFetchError?: boolean;
  showExistenceFetchTimeout?: boolean;
}

export const FieldsAccordion: React.FC<FieldsAccordionProps> = memo(function InnerFieldsAccordion({
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
  paginatedFields,
  renderFieldItem,
  renderCallout,
  showExistenceFetchError,
  showExistenceFetchTimeout,
}) {
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
          type="alert"
          color="warning"
          content={i18n.translate('unifiedFieldList.fieldsAccordion.existenceErrorLabel', {
            defaultMessage: "Field information can't be loaded",
          })}
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
        <EuiNotificationBadge size="m" color={isFiltered ? 'accent' : 'subdued'}>
          {fieldsCount}
        </EuiNotificationBadge>
      );
    }

    return <EuiLoadingSpinner size="m" />;
  }, [showExistenceFetchError, showExistenceFetchTimeout, hasLoaded, isFiltered, fieldsCount]);

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
          <ul className="unifiedFieldList__fieldsAccordion__fieldItems">
            {paginatedFields &&
              paginatedFields.map((field, index) =>
                renderFieldItem({ field, itemIndex: index, groupIndex, hideDetails })
              )}
          </ul>
        ) : (
          renderCallout()
        ))}
    </EuiAccordion>
  );
});
