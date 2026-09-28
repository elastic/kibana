/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/** Which way the flyout was opened: as a component, or through `core.overlays.openFlyoutTemplate`. */
export type FlyoutForm = 'component' | 'service';

export type ChildLabel = 'A' | 'B';

/** The session to use for tests. */
const DEFAULT_SESSION: Record<FlyoutForm, string> = {
  component: 'Session L',
  service: 'Session Z',
};

/** Root data-test-subj stem for each widget. */
const ROOT_SUBJ_STEM: Record<FlyoutForm, string> = {
  component: 'flyoutComponent',
  service: 'flyoutOverlays',
};

const subj = (value: string) => `[data-test-subj="${value}"]`;

/**
 * Page object for the flyout_system example app.
 * Locators are scoped to individual flyout roots to handle parent and child flyouts.
 */
export class FlyoutSystemApp {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('flyoutSystemExamples');
    // Wait for React to render
    await this.page.locator(subj('flyoutTypeSwitch-Session J')).waitFor({ state: 'visible' });
  }

  /** Get the test session name. */
  session(form: FlyoutForm): string {
    return DEFAULT_SESSION[form];
  }

  /** Raw CSS selector for the root element. Required for checkA11y and page.keyTo. */
  rootSelector(form: FlyoutForm, session: string): string {
    return subj(this.rootSubj(form, session));
  }

  childRootSelector(form: FlyoutForm, session: string, label: ChildLabel): string {
    return subj(this.childRootSubj(form, session, label));
  }

  /** The template derives each zone's subject from the root, e.g. `<root>Header`. */
  private rootSubj(form: FlyoutForm, session: string): string {
    return `${ROOT_SUBJ_STEM[form]}${session.replace(/\s+/g, '')}`;
  }

  private childRootSubj(form: FlyoutForm, session: string, label: ChildLabel): string {
    return `${this.rootSubj(form, session)}Child${label}`;
  }

  flyout(form: FlyoutForm, session: string): Locator {
    return this.page.locator(this.rootSelector(form, session));
  }

  childFlyout(form: FlyoutForm, session: string, label: ChildLabel): Locator {
    return this.page.locator(this.childRootSelector(form, session, label));
  }

  /** Child flyouts have different titles depending on the widget. */
  childTitle(form: FlyoutForm, session: string, label: ChildLabel): string {
    return form === 'component'
      ? `${session} - Child ${label}`
      : `Child flyout ${label} of ${session}`;
  }

  trigger(form: FlyoutForm, session: string): Locator {
    const name =
      form === 'component'
        ? `openMainFlyoutComponentButton-${session}`
        : `openMainFlyoutOverlaysButton-${session}`;
    return this.page.locator(subj(name));
  }

  childTrigger(form: FlyoutForm, session: string, label: ChildLabel): Locator {
    // Subjects are ordered differently by widget
    const name =
      form === 'component'
        ? `openChildFlyoutComponent${label}Button-${session}`
        : `openChildFlyout${label}OverlaysButton-${session}`;
    return this.flyout(form, session).locator(subj(name));
  }

  async openFlyout(form: FlyoutForm, session: string): Promise<Locator> {
    await this.trigger(form, session).click();
    const flyout = this.flyout(form, session);
    await flyout.waitFor({ state: 'visible' });
    await this.waitForAnimations(flyout);
    return flyout;
  }

  async openChildFlyout(form: FlyoutForm, session: string, label: ChildLabel): Promise<Locator> {
    await this.childTrigger(form, session, label).click();
    const child = this.childFlyout(form, session, label);
    await child.waitFor({ state: 'visible' });
    await this.waitForAnimations(child);
    return child;
  }

  /**
   * The body keeps growing while the open animation and its accordions run, so a scroll issued
   * before they settle can find too little range to cross the collapse threshold. Infinite
   * animations, such as spinners, are skipped because they never finish.
   */
  private async waitForAnimations(root: Locator) {
    await root.evaluate((el) =>
      Promise.allSettled(
        el
          .getAnimations({ subtree: true })
          .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
          .map((animation) => animation.finished)
      )
    );
  }

  // Parts within a flyout.

  header(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator(subj(`${this.rootSubj(form, session)}Header`));
  }
  collapsibleRegion(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator(subj('flyoutHeaderCollapsibleRegion'));
  }

  childCollapsibleRegion(form: FlyoutForm, session: string, label: ChildLabel): Locator {
    return this.childFlyout(form, session, label).locator(subj('flyoutHeaderCollapsibleRegion'));
  }

  titleIcon(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator(subj('flyoutHeaderTitleIcon'));
  }

  /** Only the service widget renders a tab bar. */
  tabList(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).getByRole('tablist');
  }

  tab(form: FlyoutForm, session: string, name: string): Locator {
    return this.flyout(form, session).getByRole('tab', { name });
  }

  badgeOverflow(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator(subj('flyoutHeaderBadgeOverflow'));
  }

  /** The popover renders in a portal, outside the flyout root, so this is not scoped to it. */
  badgeOverflowPanelSelector(): string {
    return subj('flyoutHeaderBadgeOverflowPanel');
  }

  metaBlockLink(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator(subj('flyoutMetaBlockLink'));
  }

  infoBlocks(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator(subj('infoBlocks'));
  }

  scrollContainer(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator(subj('euiFlyoutBodyOverflow'));
  }

  closeButton(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator(subj('euiFlyoutCloseButton'));
  }

  resizeHandle(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator(subj('euiResizableButton'));
  }

  resizeHandleSelector(form: FlyoutForm, session: string): string {
    return `${this.rootSelector(form, session)} ${subj('euiResizableButton')}`;
  }

  footerCloseAction(form: FlyoutForm, session: string): Locator {
    const name =
      form === 'component'
        ? `closeMainFlyoutComponentButton-${session}`
        : `closeMainFlyoutOverlaysButton-${session}`;
    return this.flyout(form, session).locator(subj(name));
  }

  footerSaveAction(form: FlyoutForm, session: string): Locator {
    const name =
      form === 'component'
        ? `saveMainFlyoutComponentButton-${session}`
        : `saveMainFlyoutOverlaysButton-${session}`;
    return this.flyout(form, session).locator(subj(name));
  }

  /** Child B carries the footer action menu in both widgets. */
  childFooterCloseAction(form: FlyoutForm, session: string): Locator {
    const name =
      form === 'component'
        ? `closeChildFlyoutComponentBButton-${session}`
        : `closeChildFlyoutOverlaysBButton-${session}`;
    return this.childFlyout(form, session, 'B').locator(subj(name));
  }

  private childFooterMenuSubj(form: FlyoutForm, session: string): string {
    return form === 'component'
      ? `menuChildFlyoutComponentBButton-${session}`
      : `menuChildFlyoutOverlaysBButton-${session}`;
  }

  childFooterMenuTrigger(form: FlyoutForm, session: string): Locator {
    return this.childFlyout(form, session, 'B').locator(
      subj(this.childFooterMenuSubj(form, session))
    );
  }

  /** The menu renders in a portal, outside the flyout root, so this is not scoped to it. */
  childFooterMenuPanelSelector(form: FlyoutForm, session: string): string {
    return subj(`${this.childFooterMenuSubj(form, session)}Panel`);
  }

  childFooterMenuPanel(form: FlyoutForm, session: string): Locator {
    return this.page.locator(this.childFooterMenuPanelSelector(form, session));
  }

  /** The first `EuiContextMenu` panel, which takes focus from the popover once the menu opens. */
  childFooterMenuActionsPanel(form: FlyoutForm, session: string): Locator {
    return this.childFooterMenuPanel(form, session).locator(subj('footerMenuActionsPanel'));
  }

  // Interactions.

  /**
   * Reveals the "Details" grouping and its subsections. The component widget renders it as an
   * always-open section, the service widget as a collapsed accordion.
   */
  async openDetails(form: FlyoutForm, session: string) {
    if (form === 'component') return;
    await this.flyout(form, session).getByRole('button', { name: 'Details' }).click();
  }

  /** Scrolls the body using keyboard inputs (PageDown/Home/End). */
  async scrollBodyByKeyboard(form: FlyoutForm, session: string, key: 'PageDown' | 'Home' | 'End') {
    const scroller = this.scrollContainer(form, session);
    await scroller.focus();
    await scroller.press(key);
  }

  /** Emulates mouse wheel scrolling over the header. */
  async wheelOverHeader(form: FlyoutForm, session: string, deltaY: number) {
    const header = this.header(form, session);
    await header.hover();
    await this.page.mouse.wheel(0, deltaY);
  }

  /** Whether focus currently sits inside the given element. */
  async isFocusWithin(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element.contains(document.activeElement));
  }
}
