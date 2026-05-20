import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';
/**
 * Pre 9.4 the hide_titles state was stored in a camelCased key called hidePanelTitles.
 * This transform out function ensures that this state is not dropped when loading from
 * a legacy stored state. This should only be used for embeddables that existed before 9.4.
 */
export declare const transformTitlesOut: <StoredStateType extends SerializedTitles>(storedState: StoredStateType) => StoredStateType;
