import type { Observable } from 'rxjs';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import type { HelpLinks } from './help_menu_links';
/**
 * Returns an observable of pre-built help menu link groups for the given chrome style.
 * Used by both `HeaderHelpMenu` (via `useObservable`) and the project sidenav (via `combineLatest`).
 */
export declare function useHelpLinks$(): Observable<HelpLinks>;
export declare const useHelpMenuItems: ({ closeMenu, }: {
    closeMenu: () => void;
}) => EuiContextMenuPanelItemDescriptor[];
