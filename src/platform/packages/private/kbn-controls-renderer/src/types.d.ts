import type { BehaviorSubject } from 'rxjs';
import type { ControlsGroupState, PinnedControlLayoutState } from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasSerializedChildState, PresentationContainer, PublishesDisabledActionIds, PublishesUnifiedSearch, PublishesViewMode, PublishingSubject } from '@kbn/presentation-publishing';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
type ControlState = ControlsGroupState[number];
export type ControlPanelState = Pick<ControlState, 'width' | 'grow'> & {
    order: number;
};
export interface ControlRendererServices {
    uiActions: UiActionsStart;
}
export interface ControlsLayout {
    controls: {
        [id: string]: PinnedControlLayoutState;
    };
}
export type ControlsRendererParentApi = Pick<PresentationContainer, 'children$' | 'addNewPanel' | 'replacePanel' | 'removePanel'> & Partial<PublishesUnifiedSearch> & PublishesViewMode & HasSerializedChildState<object> & Partial<PublishesDisabledActionIds> & {
    registerChildApi: (api: DefaultEmbeddableApi) => void;
    isCompressed?: () => boolean;
};
export interface PublishesFocusedPanelId {
    focusedPanelId$: BehaviorSubject<string | undefined>;
}
export interface PublishesLabel {
    label$: PublishingSubject<string | undefined>;
}
export {};
