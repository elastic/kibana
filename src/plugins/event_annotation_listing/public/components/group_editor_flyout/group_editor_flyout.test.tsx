/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiFlyout } from '@elastic/eui';
import { getDefaultManualAnnotation } from '@kbn/event-annotation-common';
import type { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import { taggingApiMock } from '@kbn/saved-objects-tagging-oss-plugin/public/api.mock';
import { shallow, ShallowWrapper } from 'enzyme';
import React from 'react';
import { GroupEditorControls } from './group_editor_controls';
import { GroupEditorFlyout } from './group_editor_flyout';
import { DataView } from '@kbn/data-views-plugin/common';
import type { QueryInputServices } from '@kbn/visualization-ui-components';
import { EmbeddableComponent } from '@kbn/lens-plugin/public';

const simulateButtonClick = (component: ShallowWrapper, selector: string) => {
  (component.find(selector) as ShallowWrapper<Parameters<typeof EuiButton>[0]>).prop('onClick')!(
    {} as any
  );
};

const SELECTORS = {
  SAVE_BUTTON: '[data-test-subj="saveAnnotationGroup"]',
  CANCEL_BUTTON: '[data-test-subj="cancelGroupEdit"]',
  BACK_BUTTON: '[data-test-subj="backToGroupSettings"]',
  TOP_BACK_BUTTON: '[data-test-subj="backToGroupSettingsTop"]',
};

const assertGroupEditingState = (component: ShallowWrapper) => {
  expect(component.exists(SELECTORS.SAVE_BUTTON)).toBeTruthy();
  expect(component.exists(SELECTORS.CANCEL_BUTTON)).toBeTruthy();
  expect(component.exists(SELECTORS.BACK_BUTTON)).toBeFalsy();
};

const assertAnnotationEditingState = (component: ShallowWrapper) => {
  expect(component.exists(SELECTORS.BACK_BUTTON)).toBeTruthy();
  expect(component.exists(SELECTORS.SAVE_BUTTON)).toBeFalsy();
  expect(component.exists(SELECTORS.CANCEL_BUTTON)).toBeFalsy();
};

describe('group editor flyout', () => {
  const annotation = getDefaultManualAnnotation('my-id', 'some-timestamp');

  const group: EventAnnotationGroupConfig = {
    annotations: [annotation],
    description: '',
    tags: [],
    indexPatternId: 'some-id',
    title: 'My group',
    ignoreGlobalFilters: false,
  };

  const mockTaggingApi = taggingApiMock.create();

  let component: ShallowWrapper;
  let onSave: jest.Mock;
  let onClose: jest.Mock;
  let updateGroup: jest.Mock;
  const LensEmbeddableComponent: EmbeddableComponent = jest.fn();

  const mountComponent = (groupToUse: EventAnnotationGroupConfig) => {
    onSave = jest.fn();
    onClose = jest.fn();
    updateGroup = jest.fn();
    return shallow(
      <GroupEditorFlyout
        group={groupToUse}
        onSave={onSave}
        onClose={onClose}
        updateGroup={updateGroup}
        dataViews={[
          {
            id: 'some-id',
            title: 'My Data View',
          } as DataView,
        ]}
        savedObjectsTagging={mockTaggingApi}
        createDataView={jest.fn()}
        queryInputServices={{} as QueryInputServices}
        LensEmbeddableComponent={LensEmbeddableComponent}
        searchSessionId={'searchSessionId'}
        refreshSearchSession={jest.fn()}
        timePickerQuickRanges={[]}
      />
    );
  };

  beforeEach(() => {
    component = mountComponent(group);
  });

  it('renders controls', () => {
    expect(component.find(GroupEditorControls).props()).toMatchSnapshot();
  });
  it('signals close', () => {
    component.find(EuiFlyout).prop('onClose')({} as MouseEvent);
    simulateButtonClick(component, SELECTORS.CANCEL_BUTTON);

    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it('signals save', () => {
    simulateButtonClick(component, SELECTORS.SAVE_BUTTON);

    expect(onSave).toHaveBeenCalledTimes(1);
  });
  it("doesn't save invalid group config", () => {
    component.setProps({
      group: { ...group, title: '' },
    });

    simulateButtonClick(component, SELECTORS.SAVE_BUTTON);

    expect(onSave).not.toHaveBeenCalled();
  });
  it('reports group updates', () => {
    const newGroup = { ...group, description: 'new description' };
    component.find(GroupEditorControls).prop('update')(newGroup);

    expect(updateGroup).toHaveBeenCalledWith(newGroup);
  });
  test.each([SELECTORS.BACK_BUTTON, SELECTORS.TOP_BACK_BUTTON])(
    'specific annotation editing',
    (backButtonSelector) => {
      assertGroupEditingState(component);

      component.find(GroupEditorControls).prop('setSelectedAnnotation')(annotation);

      assertAnnotationEditingState(component);

      component.find(backButtonSelector).simulate('click');

      assertGroupEditingState(component);
    }
  );
  it('removes active annotation instead of signaling close', () => {
    component.find(GroupEditorControls).prop('setSelectedAnnotation')(annotation);

    assertAnnotationEditingState(component);

    component.find(EuiFlyout).prop('onClose')({} as MouseEvent);

    assertGroupEditingState(component);
  });
});
