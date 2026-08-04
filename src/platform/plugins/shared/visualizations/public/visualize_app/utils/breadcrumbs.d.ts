import type { EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';
export declare function getCreateBreadcrumbs({ originatingAppName, incomingBreadcrumbs, redirectToOrigin, }: {
    originatingAppName?: string;
    incomingBreadcrumbs?: EmbeddableEditorBreadcrumb[];
    redirectToOrigin?: () => void;
}): ({
    text: string;
    href: string;
} | {
    text: string;
    onClick: (() => void) | undefined;
} | {
    text: string;
    onClick?: undefined;
})[];
export declare function getCreateServerlessBreadcrumbs(): {
    text: string;
}[];
export declare function getEditBreadcrumbs({ originatingAppName, incomingBreadcrumbs, redirectToOrigin, }: {
    originatingAppName?: string;
    incomingBreadcrumbs?: EmbeddableEditorBreadcrumb[];
    redirectToOrigin?: () => void;
}, title?: string): ({
    text: string;
    href: string;
} | {
    text: string;
    onClick: (() => void) | undefined;
} | {
    text: string;
    onClick?: undefined;
})[];
export declare function getEditServerlessBreadcrumbs(title?: string): {
    text: string;
}[];
