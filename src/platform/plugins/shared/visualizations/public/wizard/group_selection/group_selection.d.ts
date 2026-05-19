import React from 'react';
import type { DocLinksStart } from '@kbn/core/public';
import type { BaseVisType, TypesStart } from '../../vis_types';
import type { VisTypeAlias } from '../../vis_types/vis_type_alias_registry';
export interface GroupSelectionProps {
    onVisTypeSelected: (visType: BaseVisType | VisTypeAlias) => void;
    visTypesRegistry: TypesStart;
    docLinks: DocLinksStart;
    showMainDialog: (flag: boolean) => void;
    tab: 'recommended' | 'legacy';
    setTab: (tab: 'recommended' | 'legacy') => void;
}
declare function GroupSelection({ tab, setTab, visTypesRegistry, ...props }: GroupSelectionProps): React.JSX.Element;
export { GroupSelection };
