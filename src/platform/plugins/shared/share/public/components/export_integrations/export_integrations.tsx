/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, useState, Fragment, useMemo, useCallback, useRef, useEffect } from 'react';
import { Global, css } from '@emotion/react';
import {
  EuiWrappingPopover,
  EuiListGroup,
  EuiListGroupItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFormRow,
  EuiText,
  EuiTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  type EuiSwitchEvent,
  EuiSwitch,
  EuiHorizontalRule,
  euiFullHeight,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { ShareProvider, type IShareContext, useShareTypeContext } from '../context';
import { ExportShareConfig, ExportShareDerivativesConfig } from '../../types';

const flyoutBodyCss = css`
  ${euiFullHeight()}

  .euiFlyoutBody__overflowContent {
    ${euiFullHeight()}
  }
`;

export const ExportMenu: FC<{ shareContext: IShareContext }> = ({ shareContext }) => {
  return (
    <ShareProvider {...{ shareContext }}>
      <Fragment>{React.createElement(injectI18n(ExportMenuPopover))}</Fragment>
    </ShareProvider>
  );
};

interface ExportMenuProps {
  intl: InjectedIntl;
}

interface LayoutOptionsProps {
  usePrintLayout: boolean;
  printLayoutChange: (evt: EuiSwitchEvent) => void;
}

function LayoutOptionsSwitch({ usePrintLayout, printLayoutChange }: LayoutOptionsProps) {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={
            <EuiText size="s">
              <h4>
                <FormattedMessage
                  id="share.exportFlyoutContent.optimizeForPrinting.label"
                  defaultMessage="Print format"
                />
              </h4>
            </EuiText>
          }
          helpText={
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="share.exportFlyoutContent.optimizeForPrinting.helpText"
                defaultMessage="Uses multiple pages, showing at most 2 visualizations per page "
              />
            </EuiText>
          }
          fullWidth
        >
          <EuiSwitch
            label={
              <EuiText size="s">
                {usePrintLayout ? (
                  <FormattedMessage
                    id="share.exportFlyoutContent.optimizeForPrinting.selection.on"
                    defaultMessage="On"
                  />
                ) : (
                  <FormattedMessage
                    id="share.exportFlyoutContent.optimizeForPrinting.selection.off"
                    defaultMessage="Off"
                  />
                )}
              </EuiText>
            }
            checked={usePrintLayout}
            onChange={printLayoutChange}
            data-test-subj="usePrintLayout"
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ManagedFlyout({
  exportIntegration,
  intl,
  isDirty,
  onCloseFlyout,
  publicAPIEnabled,
  shareObjectTypeMeta,
  shareObjectType,
  shareObjectTypeAlias,
}: {
  exportIntegration: ExportShareConfig;
  intl: InjectedIntl;
  isDirty: boolean;
  onCloseFlyout: () => void;
  publicAPIEnabled?: boolean;
  shareObjectType: string;
  shareObjectTypeAlias?: string;
  shareObjectTypeMeta: ReturnType<
    typeof useShareTypeContext<'integration', 'export'>
  >['objectTypeMeta'];
}) {
  const [usePrintLayout, setPrintLayout] = useState(false);
  const [isCreatingExport, setIsCreatingExport] = useState<boolean>(false);
  const getReport = useCallback(async () => {
    try {
      setIsCreatingExport(true);
      await exportIntegration.config.generateAssetExport({
        intl,
        optimizedForPrinting: usePrintLayout,
      });
    } finally {
      setIsCreatingExport(false);
      onCloseFlyout();
    }
  }, [exportIntegration.config, intl, onCloseFlyout, usePrintLayout]);

  const DraftModeCallout = shareObjectTypeMeta.config?.[exportIntegration.id]?.draftModeCallOut;

  return (
    <React.Fragment>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="share.export.flyoutTitle"
              defaultMessage="Export {objectType} as {type}"
              values={{
                objectType: shareObjectTypeAlias ?? shareObjectType.toLocaleLowerCase(),
                type: exportIntegration.config.label,
              }}
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={flyoutBodyCss}>
        <EuiFlexGroup css={{ height: '100%' }} direction="column">
          <Fragment>
            {exportIntegration.config.renderLayoutOptionSwitch && (
              <EuiFlexItem>
                <LayoutOptionsSwitch
                  usePrintLayout={usePrintLayout}
                  printLayoutChange={(evt) => setPrintLayout(evt.target.checked)}
                />
              </EuiFlexItem>
            )}
          </Fragment>
          <Fragment>
            {exportIntegration?.config.copyAssetURIConfig && publicAPIEnabled && (
              <EuiFlexItem>
                <EuiFormRow
                  label={
                    <EuiText size="s">
                      <h4>{exportIntegration.config.copyAssetURIConfig.headingText}</h4>
                    </EuiText>
                  }
                  fullWidth
                >
                  <EuiFlexGroup direction="column">
                    <EuiFlexItem>
                      <EuiText size="s" color="subdued">
                        {exportIntegration.config.copyAssetURIConfig.helpText}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiCodeBlock
                        data-test-subj="exportAssetValue"
                        css={{ overflowWrap: 'break-word' }}
                        overflowHeight={360}
                        language={exportIntegration.config.copyAssetURIConfig.contentType}
                        isCopyable
                        copyAriaLabel={i18n.translate('share.export.copyPostURLAriaLabel', {
                          defaultMessage: 'Copy export asset value',
                        })}
                      >
                        {exportIntegration.config.copyAssetURIConfig.generateAssetURIValue({
                          intl,
                          optimizedForPrinting: usePrintLayout,
                        })}
                      </EuiCodeBlock>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFormRow>
              </EuiFlexItem>
            )}
          </Fragment>
          <Fragment>{exportIntegration.config.generateAssetComponent}</Fragment>
          <Fragment>
            {publicAPIEnabled && isDirty && DraftModeCallout && (
              <EuiFlexItem>{DraftModeCallout}</EuiFlexItem>
            )}
          </Fragment>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="exportFlyoutCloseButton" onClick={onCloseFlyout}>
              <FormattedMessage id="share.export.closeFlyoutButtonLabel" defaultMessage="Close" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={getReport}
              data-test-subj="generateReportButton"
              isLoading={isCreatingExport}
            >
              {exportIntegration.config.generateExportButtonLabel ?? (
                <FormattedMessage
                  id="share.export.generateButtonLabel"
                  defaultMessage="Export {type}"
                  values={{ type: exportIntegration.config.label }}
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </React.Fragment>
  );
}

function ExportMenuPopover({ intl }: ExportMenuProps) {
  const {
    onClose,
    anchorElement,
    shareMenuItems: exportIntegrations,
    isDirty,
    publicAPIEnabled,
    objectType,
    objectTypeAlias,
    objectTypeMeta,
  } = useShareTypeContext('integration', 'export');
  const { shareMenuItems: exportDerivatives } = useShareTypeContext(
    'integration',
    'exportDerivatives'
  );
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const selectionOptions = useRef({ export: exportIntegrations, exportDerivatives });
  const [selectedMenuItemMeta, setSelectedMenuItemMeta] = useState<{
    id: string;
    group: keyof typeof selectionOptions.current;
  }>();
  const selectedMenuItem = useMemo<ExportShareConfig | ExportShareDerivativesConfig | null>(() => {
    let result: ExportShareConfig | ExportShareDerivativesConfig | null = null;

    if (!selectedMenuItemMeta) {
      return result;
    }

    selectionOptions.current[selectedMenuItemMeta.group].forEach((item) => {
      if (item.id === selectedMenuItemMeta.id) {
        result = item;
      }
    });

    return result;
  }, [selectedMenuItemMeta]);

  const openFlyout = useCallback((menuItem: ExportShareConfig | ExportShareDerivativesConfig) => {
    setSelectedMenuItemMeta({ id: menuItem.id, group: menuItem.groupId });
    setIsFlyoutVisible(true);
  }, []);

  const exportIntegrationInteractionHandler = useCallback(
    async (menuItem: ExportShareConfig) => {
      if (
        !menuItem.config.copyAssetURIConfig &&
        !menuItem.config.generateAssetComponent &&
        menuItem.config.generateAssetExport
      ) {
        await menuItem.config
          .generateAssetExport({
            intl,
            optimizedForPrinting: false,
          })
          .finally(() => {
            onClose();
          });
      } else {
        openFlyout(menuItem);
      }
    },
    [intl, onClose, openFlyout]
  );

  const flyoutRef = useRef<HTMLDivElement | null>(null);

  const canSkipDisplayingPopover = useMemo<boolean>(() => {
    // when there is only one export share menu item, and no export derivatives registered,
    // we'd like to skip displaying the popover
    return exportIntegrations.length === 1 && !exportDerivatives.length;
  }, [exportIntegrations, exportDerivatives]);

  const flyoutOnCloseHandler = useCallback(() => {
    setIsFlyoutVisible(false);
    if (canSkipDisplayingPopover) {
      onClose();
    }
  }, [onClose, canSkipDisplayingPopover]);

  useEffect(() => {
    if (canSkipDisplayingPopover && !selectedMenuItemMeta) {
      exportIntegrationInteractionHandler(exportIntegrations[0]);
    }
  }, [
    exportIntegrationInteractionHandler,
    exportIntegrations,
    onClose,
    selectedMenuItemMeta,
    canSkipDisplayingPopover,
  ]);

  return (
    <Fragment>
      <EuiWrappingPopover
        isOpen={!isFlyoutVisible && !canSkipDisplayingPopover}
        button={anchorElement!}
        closePopover={onClose}
        panelPaddingSize="s"
        panelProps={{
          'data-test-subj': 'exportPopoverPanel',
        }}
      >
        <EuiListGroup flush>
          {exportIntegrations.map((menuItem) => (
            <EuiToolTip
              position="left"
              content={selectedMenuItem?.config.toolTipContent}
              key={menuItem.id}
            >
              <EuiListGroupItem
                iconType={menuItem.config.icon}
                key={menuItem.id}
                label={menuItem.config.label}
                data-test-subj={`exportMenuItem-${menuItem.config.label}`}
                isDisabled={menuItem.config.disabled}
                onClick={exportIntegrationInteractionHandler.bind(null, menuItem)}
              />
            </EuiToolTip>
          ))}
        </EuiListGroup>
        {Boolean(exportDerivatives.length) && (
          <React.Fragment>
            <EuiHorizontalRule margin="xs" />
            <EuiFlexGroup direction="column" gutterSize="s">
              {exportDerivatives.map((exportDerivative) => {
                return (
                  <EuiFlexItem key={exportDerivative.id}>
                    {exportDerivative.config.label({
                      openFlyout: openFlyout.bind(null, exportDerivative),
                    })}
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </React.Fragment>
        )}
      </EuiWrappingPopover>
      {isFlyoutVisible && (
        <EuiFlyout
          data-test-subj="exportItemDetailsFlyout"
          size="s"
          onClose={flyoutOnCloseHandler}
          css={() => ({
            ['--euiFixedHeadersOffset']: 0,
            isolation: 'isolate', // ensures that tooltips within this flyout render as should
          })}
          ownFocus
          maskProps={{
            headerZindexLocation: 'above',
          }}
          ref={flyoutRef}
          {...(selectedMenuItem?.groupId === 'exportDerivatives'
            ? selectedMenuItem.config.flyoutSizing || {}
            : {})}
        >
          {/* TODO: remove this global style once https://github.com/elastic/eui/issues/8801 is resolved  */}
          <Global
            // @ts-expect-error -- we pass a z-index specifying important so we override the default z-index, so solve a known bug,
            // where when `headerZindexLocation` is set to `above`, the popover panel z-index is not high enough
            styles={{
              '.euiPopover__panel[data-popover-open="true"]': {
                zIndex: '7000 !important',
              },
            }}
          />
          {selectedMenuItemMeta!.group === 'export' ? (
            <ManagedFlyout
              exportIntegration={selectedMenuItem as ExportShareConfig}
              shareObjectType={objectType}
              shareObjectTypeAlias={objectTypeAlias}
              shareObjectTypeMeta={objectTypeMeta}
              isDirty={isDirty}
              publicAPIEnabled={publicAPIEnabled}
              intl={intl}
              onCloseFlyout={flyoutOnCloseHandler}
            />
          ) : (
            (selectedMenuItem as ExportShareDerivativesConfig)?.config.flyoutContent({
              flyoutRef,
              closeFlyout: flyoutOnCloseHandler,
            })
          )}
        </EuiFlyout>
      )}
    </Fragment>
  );
}
