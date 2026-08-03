import { type EbtClickAttrs } from '@kbn/ebt-click';
import type { Action } from '../../components/content_framework/section/section_actions';
interface UseOpenInDiscoverSectionActionParams {
    tabLabel: string;
    dataTestSubj: string;
    href?: string;
    esql?: string;
    ebt: Omit<EbtClickAttrs, 'action'>;
}
export declare function useOpenInDiscoverSectionAction(params: UseOpenInDiscoverSectionActionParams): Action | undefined;
export {};
