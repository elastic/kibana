import type { Serializable } from '@kbn/utility-types';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DashboardAttributes as DashboardAttributesV1 } from '../../schema/v1';
import type { GridData } from '../../schema/v2';
interface KibanaAttributes {
    kibanaSavedObjectMeta: {
        searchSourceJSON?: string;
    };
}
interface Doc<Attributes extends KibanaAttributes = KibanaAttributes> {
    references: SavedObjectReference[];
    attributes: Attributes;
    id: string;
    type: string;
}
interface DocPre700<Attributes extends KibanaAttributes = KibanaAttributes> {
    attributes: Attributes;
    id: string;
    type: string;
}
interface DashboardAttributesTo720 extends KibanaAttributes {
    panelsJSON: string;
    description: string;
    uiStateJSON?: string;
    version: number;
    timeRestore: boolean;
    useMargins?: boolean;
    title: string;
    optionsJSON?: string;
}
export type DashboardDoc730ToLatest = Doc<DashboardAttributesV1>;
export type DashboardDoc700To720 = Doc<DashboardAttributesTo720>;
export type DashboardDocPre700 = DocPre700<DashboardAttributesTo720>;
export type RawSavedDashboardPanel730ToLatest = Pick<RawSavedDashboardPanel640To720, Exclude<keyof RawSavedDashboardPanel640To720, 'name'>> & {
    readonly type?: string;
    readonly name?: string;
    panelIndex: string;
    panelRefName?: string;
};
export type RawSavedDashboardPanel640To720 = Pick<RawSavedDashboardPanel630, Exclude<keyof RawSavedDashboardPanel630, 'columns' | 'sort'>>;
export type RawSavedDashboardPanel630 = RawSavedDashboardPanel620;
export type RawSavedDashboardPanel620 = RawSavedDashboardPanel610 & {
    embeddableConfig: {
        [key: string]: Serializable;
    };
    version: string;
};
export type RawSavedDashboardPanel610 = Pick<RawSavedDashboardPanelTo60, Exclude<keyof RawSavedDashboardPanelTo60, 'size_x' | 'size_y' | 'col' | 'row'>> & {
    gridData: GridData;
    version: string;
};
export interface RawSavedDashboardPanelTo60 {
    readonly columns?: string[];
    readonly sort?: string;
    readonly size_x?: number;
    readonly size_y?: number;
    readonly row: number;
    readonly col: number;
    panelIndex?: number | string;
    readonly name: string;
    title?: string;
}
export type SavedDashboardPanel640To720 = Pick<RawSavedDashboardPanel640To720, Exclude<keyof RawSavedDashboardPanel640To720, 'name'>> & {
    readonly id: string;
    readonly type: string;
};
export type SavedDashboardPanel630 = Pick<RawSavedDashboardPanel630, Exclude<keyof RawSavedDashboardPanel620, 'name'>> & {
    readonly id: string;
    readonly type: string;
};
export type SavedDashboardPanel620 = Pick<RawSavedDashboardPanel620, Exclude<keyof RawSavedDashboardPanel620, 'name'>> & {
    readonly id: string;
    readonly type: string;
};
export type SavedDashboardPanel610 = Pick<RawSavedDashboardPanel610, Exclude<keyof RawSavedDashboardPanel610, 'name'>> & {
    readonly id: string;
    readonly type: string;
};
export type SavedDashboardPanelTo60 = Pick<RawSavedDashboardPanelTo60, Exclude<keyof RawSavedDashboardPanelTo60, 'name'>> & {
    readonly id: string;
    readonly type: string;
};
export type SavedDashboardPanel730ToLatest = Pick<RawSavedDashboardPanel730ToLatest, Exclude<keyof RawSavedDashboardPanel730ToLatest, 'name'>> & {
    readonly id?: string;
    readonly type: string;
};
export {};
