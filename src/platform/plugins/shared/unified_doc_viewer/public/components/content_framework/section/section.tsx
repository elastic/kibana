/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { EuiAccordionProps, IconType } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiTourStep,
  useEuiTheme,
} from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { i18n } from '@kbn/i18n';

interface BaseAction {
  icon: IconType;
  ariaLabel: string;
  dataTestSubj?: string;
  label?: string;
  tour?: {
    title: string;
    subtitle: string;
    content: React.ReactNode;
  };
}

type Action =
  | (BaseAction & { onClick: () => void; href?: never })
  | (BaseAction & { href: string; onClick?: never });

export interface ContentFrameworkSectionProps {
  id: string;
  title: string;
  description?: string;
  actions?: Action[];
  children: React.ReactNode;
  'data-test-subj'?: string;
  onToggle?: (isOpen: boolean) => void;
  forceState?: EuiAccordionProps['forceState'];
  isTechPreview?: boolean;
  hasBorder?: boolean;
  hasPadding?: boolean;
}

const sectionsTourStorageKey = 'contentFramework.sectionsTourDismissed';

export function ContentFrameworkSection({
  id,
  title,
  description,
  actions,
  children,
  onToggle,
  forceState = 'open',
  'data-test-subj': accordionDataTestSubj,
  isTechPreview = false,
  hasBorder = true,
  hasPadding = true,
}: ContentFrameworkSectionProps) {
  const [accordionState, setAccordionState] = useState<EuiAccordionProps['forceState']>(forceState);
  const [dismissedTours, setDismissedTours] = useLocalStorage<string[]>(sectionsTourStorageKey, []);
  const { euiTheme } = useEuiTheme();

  const dismissTour = (actionName: string) => {
    setDismissedTours(dismissedTours ? [...dismissedTours, actionName] : [actionName]);
  };

  const renderActionButton = ({ icon, ariaLabel, dataTestSubj, label, onClick, href }: Action) => {
    const size = 'xs';
    const buttonProps = onClick ? { onClick } : { href };

    return (
      <>
        {label ? (
          <EuiButtonEmpty
            size={size}
            iconType={icon}
            aria-label={ariaLabel}
            data-test-subj={dataTestSubj}
            {...buttonProps}
          >
            {label}
          </EuiButtonEmpty>
        ) : (
          <EuiButtonIcon
            size={size}
            iconType={icon}
            aria-label={ariaLabel}
            data-test-subj={dataTestSubj}
            {...buttonProps}
          />
        )}
      </>
    );
  };
  const renderActions = () => (
    <>
      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
        {actions?.map((action, idx) => {
          const { ariaLabel, tour } = action;
          return (
            <EuiFlexItem grow={false} key={idx}>
              {tour ? (
                <EuiTourStep
                  content={tour?.content}
                  isStepOpen={!dismissedTours?.includes(ariaLabel)}
                  maxWidth={350}
                  onFinish={() => {}}
                  step={1}
                  stepsTotal={1}
                  title={tour?.title}
                  subtitle={tour?.subtitle}
                  footerAction={
                    <EuiButtonEmpty
                      aria-label={i18n.translate(
                        'unifiedDocViewer.contentFramework.section.tourStep.okButton',
                        {
                          defaultMessage: 'Close {action} tour',
                          values: { action: ariaLabel },
                        }
                      )}
                      onClick={() => {
                        dismissTour(ariaLabel);
                      }}
                    >
                      {i18n.translate(
                        'unifiedDocViewer.contentFramework.section.tourStep.okButtonLabel',
                        { defaultMessage: 'OK' }
                      )}
                    </EuiButtonEmpty>
                  }
                  zIndex={Number(euiTheme.levels.flyout)}
                >
                  {renderActionButton(action)}
                </EuiTourStep>
              ) : (
                renderActionButton(action)
              )}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </>
  );

  useEffect(() => {
    setAccordionState(forceState);
  }, [forceState]);

  const handleToggle = (isOpen: boolean) => {
    setAccordionState(isOpen ? 'open' : 'closed');
    onToggle?.(isOpen);
  };

  return (
    <>
      <EuiAccordion
        data-test-subj={accordionDataTestSubj}
        id={`sectionAccordion-${id}`}
        initialIsOpen={forceState === 'open'}
        onToggle={handleToggle}
        forceState={accordionState}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {description ? (
              <EuiFlexItem grow={false}>
                {isTechPreview ? (
                  <EuiBetaBadge
                    size="s"
                    label={description}
                    alignment="middle"
                    color="hollow"
                    iconType="beaker"
                    title={title}
                    data-test-subj="ContentFrameworkSectionEuiBetaBadge"
                  />
                ) : (
                  <EuiIconTip
                    content={description}
                    size="s"
                    color="subdued"
                    aria-label={description}
                  />
                )}
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        }
        extraAction={
          actions?.length && (
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>{renderActions()}</EuiFlexItem>
            </EuiFlexGroup>
          )
        }
      >
        <>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder={hasBorder} hasShadow={false} paddingSize={hasPadding ? 's' : 'none'}>
            {children}
          </EuiPanel>
        </>
      </EuiAccordion>
      {accordionState === 'closed' ? <EuiHorizontalRule margin="xs" /> : <EuiSpacer size="m" />}
    </>
  );
}
