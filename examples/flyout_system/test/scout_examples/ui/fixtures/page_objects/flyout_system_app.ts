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
    return subj(`${ROOT_SUBJ_STEM[form]}${session.replace(/\s+/g, '')}`);
  }

  childRootSelector(form: FlyoutForm, session: string, label: ChildLabel): string {
    return subj(`${ROOT_SUBJ_STEM[form]}${session.replace(/\s+/g, '')}Child${label}`);
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

  ownFocusSwitch(session: string): Locator {
    return this.page.locator(subj(`flyoutOwnFocusSwitch-${session}`));
  }

  async openFlyout(form: FlyoutForm, session: string): Promise<Locator> {
    await this.trigger(form, session).click();
    const flyout = this.flyout(form, session);
    await flyout.waitFor({ state: 'visible' });
    return flyout;
  }

  async openChildFlyout(form: FlyoutForm, session: string, label: ChildLabel): Promise<Locator> {
    await this.childTrigger(form, session, label).click();
    const child = this.childFlyout(form, session, label);
    await child.waitFor({ state: 'visible' });
    return child;
  }

  // Parts within a flyout.

  header(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator('.euiFlyoutHeader');
  }

  collapsibleRegion(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator(subj('flyoutHeaderCollapsibleRegion'));
  }

  childCollapsibleRegion(form: FlyoutForm, session: string, label: ChildLabel): Locator {
    return this.childFlyout(form, session, label).locator(subj('flyoutHeaderCollapsibleRegion'));
  }

  badgeOverflow(form: FlyoutForm, session: string): Locator {
    return this.flyout(form, session).locator(subj('flyoutHeaderBadgeOverflow'));
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

  childCloseButton(form: FlyoutForm, session: string, label: ChildLabel): Locator {
    return this.childFlyout(form, session, label).locator(subj('euiFlyoutCloseButton'));
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

  // Interactions.

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
