/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useObservable from 'react-use/lib/useObservable';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiText,
  EuiForm,
  EuiImage,
  EuiTitle,
  EuiPanel,
  EuiSpacer,
  EuiButton,
  EuiToolTip,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiDroppable,
  EuiDraggable,
  EuiFlyoutBody,
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSwitch,
  EuiFieldText,
  EuiDragDropContext,
  euiDragDropReorder,
} from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { coreServices } from '../services/kibana_services';
import {
  NavigationEmbeddableAttributes,
  NavigationEmbeddableLink,
} from '../../common/content_management';
import { NavEmbeddableStrings } from './navigation_embeddable_strings';

import { openLinkEditorFlyout } from '../editor/open_link_editor_flyout';
import { memoizedGetOrderedLinkList } from '../editor/navigation_embeddable_editor_tools';
import { NavigationEmbeddablePanelEditorLink } from './navigation_embeddable_panel_editor_link';

import noLinksIllustrationDark from '../assets/empty_links_dark.svg';
import noLinksIllustrationLight from '../assets/empty_links_light.svg';
import './navigation_embeddable.scss';

const NavigationEmbeddablePanelEditor = ({
  onSave,
  onClose,
  attributes,
  savedObjectId,
  parentDashboard,
}: {
  onSave: (newAttributes: NavigationEmbeddableAttributes, useRefType: boolean) => void;
  onClose: () => void;
  attributes?: NavigationEmbeddableAttributes;
  savedObjectId?: string;
  parentDashboard?: DashboardContainer;
}) => {
  const isDarkTheme = useObservable(coreServices.theme.theme$)?.darkMode;
  const editLinkFlyoutRef: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  const [orderedLinks, setOrderedLinks] = useState<NavigationEmbeddableLink[]>([]);
  const [saveToLibrary, setSaveToLibrary] = useState(Boolean(savedObjectId));
  const [libraryTitle, setLibraryTitle] = useState<string>(attributes?.title ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const initialLinks = attributes?.links;
    if (!initialLinks) {
      setOrderedLinks([]);
      return;
    }
    setOrderedLinks(memoizedGetOrderedLinkList(initialLinks));
  }, [attributes]);

  const onDragEnd = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const newList = euiDragDropReorder(orderedLinks, source.index, destination.index).map(
          (link, i) => {
            return { ...link, order: i };
          }
        );
        setOrderedLinks(newList);
      }
    },
    [orderedLinks]
  );

  const addOrEditLink = useCallback(
    async (linkToEdit?: NavigationEmbeddableLink) => {
      const newLink = await openLinkEditorFlyout({
        parentDashboard,
        link: linkToEdit,
        ref: editLinkFlyoutRef,
      });
      if (newLink) {
        if (linkToEdit) {
          setOrderedLinks(
            orderedLinks.map((link) => {
              if (link.id === linkToEdit.id) {
                return { ...newLink, order: linkToEdit.order };
              }
              return link;
            })
          );
        } else {
          setOrderedLinks([...orderedLinks, { ...newLink, order: orderedLinks.length }]);
        }
      }
    },
    [editLinkFlyoutRef, orderedLinks, parentDashboard]
  );

  const deleteLink = useCallback(
    (linkId: string) => {
      setOrderedLinks(
        orderedLinks.filter((link) => {
          return link.id !== linkId;
        })
      );
    },
    [orderedLinks]
  );

  const saveButtonComponent = useMemo(() => {
    const canSave = orderedLinks.length !== 0 && saveToLibrary ? Boolean(libraryTitle) : true;

    const button = (
      <EuiButton
        disabled={!canSave}
        isLoading={isSaving}
        onClick={async () => {
          setIsSaving(true);
          const newLinks = [...orderedLinks];
          const newAttributes: NavigationEmbeddableAttributes = {
            title: libraryTitle,
            links: newLinks,
          };
          await onSave(newAttributes, Boolean(savedObjectId) || saveToLibrary);
          setIsSaving(false);
        }}
      >
        {savedObjectId
          ? NavEmbeddableStrings.editor.panelEditor.getUpdateLibraryItemButtonLabel()
          : NavEmbeddableStrings.editor.panelEditor.getSaveButtonLabel()}
      </EuiButton>
    );

    return canSave ? (
      button
    ) : (
      <EuiToolTip content={NavEmbeddableStrings.editor.panelEditor.getEmptyLinksTooltip()}>
        {button}
      </EuiToolTip>
    );
  }, [onSave, isSaving, orderedLinks, saveToLibrary, libraryTitle, savedObjectId]);

  return (
    <>
      <div ref={editLinkFlyoutRef} />
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {attributes?.links && Object.keys(attributes?.links).length > 0
              ? NavEmbeddableStrings.editor.panelEditor.getEditFlyoutTitle()
              : NavEmbeddableStrings.editor.panelEditor.getCreateFlyoutTitle()}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm fullWidth>
          <EuiFormRow>
            <>
              {orderedLinks.length === 0 ? (
                <EuiPanel paddingSize="m" hasBorder={true}>
                  <EuiEmptyPrompt
                    paddingSize="none"
                    hasShadow={false}
                    color="plain"
                    icon={
                      <EuiImage
                        alt="alt"
                        size="s"
                        src={isDarkTheme ? noLinksIllustrationDark : noLinksIllustrationLight}
                      />
                    }
                    body={
                      <>
                        <EuiText size="s">
                          {NavEmbeddableStrings.editor.panelEditor.getEmptyLinksMessage()}
                        </EuiText>
                        <EuiSpacer size="m" />
                        <EuiButton size="s" onClick={() => addOrEditLink()} iconType="plusInCircle">
                          {NavEmbeddableStrings.editor.getAddButtonLabel()}
                        </EuiButton>
                      </>
                    }
                  />
                </EuiPanel>
              ) : (
                <>
                  <EuiDragDropContext onDragEnd={onDragEnd}>
                    <EuiDroppable droppableId="navEmbeddableDroppableLinksArea">
                      {orderedLinks.map((link, idx) => (
                        <EuiDraggable
                          spacing="m"
                          key={link.id}
                          index={idx}
                          draggableId={link.id}
                          customDragHandle={true}
                          hasInteractiveChildren={true}
                        >
                          {(provided) => (
                            <NavigationEmbeddablePanelEditorLink
                              link={link}
                              parentDashboard={parentDashboard}
                              editLink={() => addOrEditLink(link)}
                              deleteLink={() => deleteLink(link.id)}
                              dragHandleProps={provided.dragHandleProps}
                            />
                          )}
                        </EuiDraggable>
                      ))}
                    </EuiDroppable>
                  </EuiDragDropContext>
                  <EuiButtonEmpty size="s" iconType="plusInCircle" onClick={() => addOrEditLink()}>
                    {NavEmbeddableStrings.editor.getAddButtonLabel()}
                  </EuiButtonEmpty>
                </>
              )}
            </>
          </EuiFormRow>
          <EuiFormRow>
            <EuiSwitch
              label="Save to library"
              checked={saveToLibrary}
              compressed
              onChange={(e) => setSaveToLibrary(e.target.checked)}
            />
          </EuiFormRow>
          {saveToLibrary ? (
            <EuiFormRow label={NavEmbeddableStrings.editor.panelEditor.getTitleInputLabel()}>
              <EuiFieldText
                id="titleInput"
                name="title"
                type="text"
                value={libraryTitle ?? ''}
                onChange={(e) => setLibraryTitle(e.target.value)}
                required={saveToLibrary}
              />
            </EuiFormRow>
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} iconType="cross">
              {NavEmbeddableStrings.editor.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{saveButtonComponent}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default NavigationEmbeddablePanelEditor;
