import type { OptionsListESQLControlState, OptionsListSearchTechnique } from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishesESQLVariable, QueryESQLControl, StaticESQLControl } from '@kbn/esql-types';
import type { HasEditCapabilities, HasType, HasUniqueId, PublishesDataLoading, PublishesUnsavedChanges, PublishingSubject } from '@kbn/presentation-publishing';
import type { SettersOf, SubjectsOf } from '@kbn/presentation-publishing/state_manager/types';
import type { TemporaryState } from '../data_controls/options_list_control/temporay_state_manager';
import type { OptionsListPublishesOptions, OptionsListSelectionsApi } from '../types';
import type { initializeLabelManager } from '../control_labels';
export type ESQLControlApi<State> = DefaultEmbeddableApi<State extends {
    control_type: 'STATIC_VALUES';
} ? StaticESQLControl : QueryESQLControl> & PublishesESQLVariable & PublishesUnsavedChanges & HasEditCapabilities & PublishesDataLoading & ReturnType<typeof initializeLabelManager>['api'];
export type ESQLOptionsListRuntimeState = Omit<OptionsListESQLControlState, 'available_options'> & Pick<StaticESQLControl, 'available_options'>;
export type ESQLOptionsListComponentState = Pick<OptionsListESQLControlState, 'single_select' | 'selected_options'> & {
    /**
     * For API consistency, we continue to refer to the control's label as `title`; however, to avoid
     * being impacted by default embeddable title handling, we switch to `label` for the implementation
     */
    label: string;
} & Omit<TemporaryState<string>, 'requestSize'>;
export type ESQLOptionsListComponentApi = HasType & HasUniqueId & OptionsListPublishesOptions<string> & SubjectsOf<ESQLOptionsListComponentState> & SettersOf<Omit<TemporaryState<string>, 'availableOptions' | 'requestSize' | 'searchStringValid' | 'totalCardinality'>> & OptionsListSelectionsApi & {
    searchTechnique$: PublishingSubject<OptionsListSearchTechnique>;
};
