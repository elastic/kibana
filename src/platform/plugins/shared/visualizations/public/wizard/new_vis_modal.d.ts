import React from 'react';
import type { ApplicationStart, DocLinksStart, IUiSettingsClient } from '@kbn/core/public';
import type { EmbeddableStateTransfer, EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { TypesStart, BaseVisType } from '../vis_types';
export interface TypeSelectionProps {
    contentClient: ContentClient;
    isOpen: boolean;
    onClose: () => void;
    visTypesRegistry: TypesStart;
    editorParams?: string[];
    addBasePath: (path: string) => string;
    uiSettings: IUiSettingsClient;
    docLinks: DocLinksStart;
    application: ApplicationStart;
    outsideVisualizeApp?: boolean;
    stateTransfer?: EmbeddableStateTransfer;
    originatingApp?: string;
    originatingPath?: string;
    breadcrumbs?: EmbeddableEditorBreadcrumb[];
    showAggsSelection?: boolean;
    selectedVisType?: BaseVisType;
}
interface TypeSelectionState {
    showSearchVisModal: boolean;
    isMainDialogShown: boolean;
    visType?: BaseVisType;
    tab: 'recommended' | 'legacy';
}
declare class NewVisModal extends React.Component<TypeSelectionProps, TypeSelectionState> {
    static defaultProps: {
        editorParams: never[];
    };
    private readonly trackUiMetric;
    constructor(props: TypeSelectionProps);
    setTab: (tab: "recommended" | "legacy") => void;
    render(): React.JSX.Element | null;
    private onCloseModal;
    private onVisTypeSelected;
    private onSearchSelected;
    private redirectToVis;
    private navigate;
}
export { NewVisModal as default };
