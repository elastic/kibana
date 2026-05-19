export interface RouterLinkProps {
    href: string | undefined;
    onClick: (event: React.MouseEvent<Element, MouseEvent>) => void;
}
interface GetRouterLinkPropsDeps {
    href?: string;
    onClick(event: React.MouseEvent<Element, MouseEvent>): void;
}
/**
 *
 * getRouterLinkProps is an util that enable HTML elements, such buttons, to
 * behave as links.
 * @example
 * const linkProps = getRouterLinkProps({ href: 'https://my-link', onClick: () => {console.log('click event')} });
 * <EuiButton {...linkProps}>My custom link</EuiButton>
 * @param href target url
 * @param onClick onClick callback
 * @returns An object that contains an href and a guardedClick handler that will
 * manage behaviours such as leftClickEvent and event with modifiers (Ctrl, Shift, etc)
 */
export declare const getRouterLinkProps: ({ href, onClick }: GetRouterLinkPropsDeps) => RouterLinkProps;
export {};
