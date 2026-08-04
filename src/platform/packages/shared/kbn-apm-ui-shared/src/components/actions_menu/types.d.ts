import type { EbtClickAttrs } from '@kbn/ebt-click';
export interface ActionBase {
    id: string;
    name: string;
    onClick?: () => void;
    href?: string;
    icon?: string;
    ebt: EbtClickAttrs;
}
export type ActionSubItem = ActionBase;
export interface Action extends ActionBase {
    items?: ActionSubItem[];
}
export interface ActionGroup {
    id: string;
    groupLabel?: string;
    actions: Action[];
}
export type ActionGroups = ActionGroup[];
