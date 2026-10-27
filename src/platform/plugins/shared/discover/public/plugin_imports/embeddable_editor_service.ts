/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  DiscoverSessionTab,
  SavedSearchByValueAttributes,
} from '@kbn/saved-search-plugin/common';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { EmbeddableEditorState, EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import type { ApplicationStart } from '@kbn/core/public';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { ControlPanelState, ControlPanelsState } from '@kbn/control-group-renderer';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { SearchEmbeddableByReferenceState } from '../../common/embeddable/types';
import type { SearchEmbeddablePanelApiState } from '../embeddable/types';

/**
 * State the originating dashboard hands to the Discover editor. `discoverSessionTab` is only set
 * for by-value panels; `dashboardControlGroupState` is set for both by-value and by-reference
 * panels so controls created in Discover can be reconciled with the dashboard's existing ones.
 */
export interface DiscoverSessionEditorInput {
  discoverSessionTab: DiscoverSessionTab | undefined;
  dashboardControlGroupState: ControlPanelsState<OptionsListESQLControlState> | undefined;
}

/**
 * Specifies the action to be taken for navigating back to an editor.
 */
export enum TransferAction {
  /**
   * A Cancel operation. Returns to the editor without modifying the original state.
   */
  Cancel,
  /**
   * A Save Session operation. Updates the saved session and doesn't pass back any serialised state,
   * only the controls the originating dashboard is missing.
   */
  SaveSession,
  /**
   * A Save By Value operation. Sends the serialised embeddable attributes to the editor.
   */
  SaveByValue,
  /**
   * A Save By Reference operation. Sends a saved object reference to the editor.
   */
  SaveByReference,
}

interface TransferOptionsBase {
  path?: string;
  app?: string;
  newPanel?: boolean;
}

interface ByValueTransferOptions extends TransferOptionsBase {
  state: {
    byValueState: SavedSearchByValueAttributes;
    controlGroupState: ControlPanelsState<OptionsListESQLControlState> | undefined;
  };
}

interface ByReferenceTransferOptions extends TransferOptionsBase {
  state: SearchEmbeddableByReferenceState & {
    controlGroupState?: ControlPanelsState<OptionsListESQLControlState>;
  };
}

interface SaveSessionTransferOptions extends TransferOptionsBase {
  state?: {
    controlGroupState?: ControlPanelsState<OptionsListESQLControlState>;
  };
}

type CombinedTransferOptions =
  | ByValueTransferOptions
  | ByReferenceTransferOptions
  | SaveSessionTransferOptions;

type DiscoverTransferSerializedState =
  | ControlPanelState<OptionsListESQLControlState>
  | SearchEmbeddablePanelApiState
  | {};

interface GetSerializedStateResult {
  serializedState: SearchEmbeddablePanelApiState | {};
  controlGroupState: ControlPanelsState<OptionsListESQLControlState>;
}

export class EmbeddableEditorService {
  private embeddableState?: EmbeddableEditorState;

  constructor(
    private embeddableStateTransfer: EmbeddableStateTransfer,
    private application: ApplicationStart
  ) {
    this.embeddableState = embeddableStateTransfer.getIncomingEditorState('discover', true);
  }

  public canSaveToDashboard = (): boolean =>
    !this.isEmbeddedEditor() &&
    Boolean(this.application.capabilities.dashboard_v2.show) &&
    Boolean(this.application.capabilities.dashboard_v2.createNew);

  public isByValueEditor = (): boolean => Boolean(this.getEditorInput().discoverSessionTab);

  public isEmbeddedEditor = (): boolean => Boolean(this.embeddableState);

  public getEmbeddableId = (): string | undefined => this.embeddableState?.embeddableId;

  public getOriginatingPath = (): string | undefined => this.embeddableState?.originatingPath;

  public getByValueTab = (): DiscoverSessionTab | undefined =>
    this.getEditorInput().discoverSessionTab;

  /**
   * Resets the embeddable transfer state, ensuring it is cleared in storage and then dropped in memory.
   */
  public clearEditorState = () => {
    if (this.embeddableState) {
      this.embeddableStateTransfer.clearEditorState('discover');
      this.embeddableState = undefined;
    }
  };

  public transferBackToEditor(action: TransferAction.Cancel): void;
  public transferBackToEditor(
    action: TransferAction.SaveSession,
    options?: SaveSessionTransferOptions
  ): void;
  public transferBackToEditor(
    action: TransferAction.SaveByValue,
    options: ByValueTransferOptions
  ): void;
  public transferBackToEditor(
    action: TransferAction.SaveByReference,
    options: ByReferenceTransferOptions
  ): void;
  /**
   * Initiates a navigation back to the editing application, either cancelling the current action to return
   * or passing a state for an embeddable to receive an updated view.
   *
   * **NOTE**: Cancelling will never pass an updated state, so the state param is ignored for cancel actions.
   */
  public transferBackToEditor(action: TransferAction, options?: CombinedTransferOptions) {
    const app = options?.app || this.embeddableState?.originatingApp;
    const path = options?.path || this.embeddableState?.originatingPath;
    // The dashboard's control state is only known for the dashboard the editor was opened from
    const targetsOriginatingEditor =
      Boolean(this.embeddableState) &&
      app === this.embeddableState?.originatingApp &&
      path === this.embeddableState?.originatingPath;
    const { serializedState, controlGroupState } = this.getSerializedState(
      action,
      options,
      targetsOriginatingEditor
    );
    const controlPackages = Object.entries(controlGroupState).map(
      ([embeddableId, controlPanelState]) => ({
        type: ESQL_CONTROL,
        serializedState: controlPanelState,
        embeddableId,
      })
    );

    if (app && path) {
      this.embeddableStateTransfer.clearEditorState('discover');
      this.embeddableStateTransfer.navigateToWithEmbeddablePackages<DiscoverTransferSerializedState>(
        app,
        {
          path,
          state:
            action !== TransferAction.Cancel
              ? [
                  ...controlPackages,
                  {
                    type: SEARCH_EMBEDDABLE_TYPE,
                    serializedState,
                    embeddableId: options?.newPanel
                      ? undefined
                      : this.embeddableState?.embeddableId,
                  },
                ]
              : [],
        }
      );
    }
  }

  private getSerializedState(
    action: TransferAction,
    options: CombinedTransferOptions | undefined,
    targetsOriginatingEditor: boolean
  ): GetSerializedStateResult {
    if (action === TransferAction.SaveByValue) {
      const { state } = options as ByValueTransferOptions;
      return {
        serializedState: { attributes: state.byValueState },
        controlGroupState: reconcileControlGroupState({
          controlGroupState: state.controlGroupState ?? {},
          dashboardControlGroupState: this.getEditorInput().dashboardControlGroupState,
        }),
      };
    }

    const dashboardControlGroupState = targetsOriginatingEditor
      ? this.getEditorInput().dashboardControlGroupState
      : undefined;

    if (action === TransferAction.SaveByReference) {
      const { state } = options as ByReferenceTransferOptions;
      return {
        serializedState: { ref_id: state.savedObjectId, overrides: {} },
        controlGroupState: getControlsMissingFromDashboard({
          controlGroupState: state.controlGroupState ?? {},
          dashboardControlGroupState,
        }),
      };
    }

    if (action === TransferAction.SaveSession) {
      const { state } = (options as SaveSessionTransferOptions | undefined) ?? {};
      return {
        serializedState: {},
        controlGroupState: getControlsMissingFromDashboard({
          controlGroupState: state?.controlGroupState ?? {},
          dashboardControlGroupState,
        }),
      };
    }

    return { serializedState: {}, controlGroupState: {} };
  }

  private getEditorInput(): DiscoverSessionEditorInput {
    return this.embeddableState?.valueInput
      ? (this.embeddableState.valueInput as DiscoverSessionEditorInput)
      : { discoverSessionTab: undefined, dashboardControlGroupState: undefined };
  }
}

/**
 * Keeps only the controls whose variable has no control on the dashboard yet, so the existing
 * dashboard controls and their current selections are left untouched.
 */
const getControlsMissingFromDashboard = ({
  controlGroupState,
  dashboardControlGroupState,
}: {
  controlGroupState: ControlPanelsState<OptionsListESQLControlState>;
  dashboardControlGroupState: ControlPanelsState<OptionsListESQLControlState> | undefined;
}): ControlPanelsState<OptionsListESQLControlState> => {
  if (!dashboardControlGroupState) {
    return controlGroupState;
  }

  const dashboardVariableNames = new Set(
    Object.values(dashboardControlGroupState).map((panelState) => panelState.variable_name)
  );

  return Object.fromEntries(
    Object.entries(controlGroupState).filter(
      ([, panelState]) => !dashboardVariableNames.has(panelState.variable_name)
    )
  );
};

const reconcileControlGroupState = ({
  controlGroupState,
  dashboardControlGroupState,
}: {
  controlGroupState: ControlPanelsState<OptionsListESQLControlState>;
  dashboardControlGroupState: ControlPanelsState<OptionsListESQLControlState> | undefined;
}): ControlPanelsState<OptionsListESQLControlState> => {
  if (!dashboardControlGroupState) {
    return controlGroupState;
  }

  const dashboardPanelIdsByVariable = Object.fromEntries(
    Object.entries(dashboardControlGroupState).map(([dashboardPanelId, dashboardPanelState]) => [
      dashboardPanelState.variable_name,
      dashboardPanelId,
    ])
  );

  return Object.entries(controlGroupState).reduce<ControlPanelsState<OptionsListESQLControlState>>(
    (acc, [discoverPanelId, panelState]) => {
      const nextPanelId = dashboardPanelIdsByVariable[panelState.variable_name] ?? discoverPanelId;

      acc[nextPanelId] = panelState;

      return acc;
    },
    {}
  );
};
