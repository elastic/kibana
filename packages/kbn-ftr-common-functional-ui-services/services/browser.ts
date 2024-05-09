/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { modifyUrl } from '@kbn/std';
import { cloneDeepWith, isString } from 'lodash';
import { Key, Origin, type WebDriver } from 'selenium-webdriver';
import { Driver as ChromiumWebDriver } from 'selenium-webdriver/chrome';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import Url from 'url';

import { NoSuchSessionError } from 'selenium-webdriver/lib/error';
import sharp from 'sharp';
import {
  WebElementWrapper,
  Browsers,
  NETWORK_PROFILES,
  type NetworkOptions,
  type NetworkProfile,
} from '..';
import { FtrService, type FtrProviderContext } from './ftr_provider_context';

export type Browser = BrowserService;

class BrowserService extends FtrService {
  /**
   * Keyboard events
   */
  public readonly keys = Key;
  public readonly isFirefox: boolean;

  private readonly log = this.ctx.getService('log');

  constructor(
    ctx: FtrProviderContext,
    public readonly browserType: string,
    protected readonly driver: WebDriver | ChromiumWebDriver
  ) {
    super(ctx);
    this.isFirefox = this.browserType === Browsers.Firefox;
  }

  public isChromium(): this is { driver: ChromiumWebDriver } {
    return this.driver instanceof ChromiumWebDriver;
  }

  /**
   * Returns instance of Actions API based on driver w3c flag
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#actions
   */
  public getActions() {
    return this.driver.actions();
  }

  /**
   * Get handle for an alert, confirm, or prompt dialog. (if any).
   * @return {Promise<void>}
   */
  public async getAlert() {
    try {
      return await this.driver.switchTo().alert();
    } catch (e) {
      return null;
    }
  }

  /**
   * Retrieves the a rect describing the current top-level window's size and position.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Window.html
   *
   * @return {Promise<{height: number, width: number, x: number, y: number}>}
   */
  public async getWindowSize(): Promise<{ height: number; width: number; x: number; y: number }> {
    return await this.driver.manage().window().getRect();
  }

  public async getWindowInnerSize(): Promise<{ height: number; width: number }> {
    const JS_GET_INNER_WIDTH = 'return { width: window.innerWidth, height: window.innerHeight };';
    return await this.driver.executeScript(JS_GET_INNER_WIDTH);
  }

  /**
   * Sets the dimensions of a window.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Window.html
   *
   * @param {number} width
   * @param {number} height
   * @return {Promise<void>}
   */
  public async setWindowSize(width: number, height: number) {
    await this.driver.manage().window().setRect({ width, height });
  }

  /**
   * Gets a screenshot of the focused window and returns it as a Bitmap object
   */
  public async getScreenshotAsBitmap() {
    const screenshot = await this.takeScreenshot();
    const buffer = Buffer.from(screenshot, 'base64');

    const session = sharp(buffer).png({ quality: 100, progressive: true }).clone();
    return session;
  }

  /**
   * Sets the dimensions of a window to get the right size screenshot.
   *
   * @param {number} width
   * @param {number} height
   * @return {Promise<void>}
   */
  public async setScreenshotSize(width: number, height: number) {
    this.log.debug(`======browser======== setWindowSize ${width} ${height}`);
    // We really want to set the Kibana app to a specific size without regard to the browser chrome (borders)
    // But that means we first need to figure out the display scaling factor.
    // NOTE: None of this is required when running Chrome headless because there's no scaling and no borders.
    const largeWidth = 1200;
    const largeHeight = 800;
    const smallWidth = 600;
    const smallHeight = 400;

    await this.setWindowSize(largeWidth, largeHeight);
    const bitmap1 = await this.getScreenshotAsBitmap();
    const bm1Data = await bitmap1.metadata();
    this.log.debug(
      `======browser======== actual initial screenshot size width=${bm1Data.width}, height=${bm1Data.height}`
    );

    // drasticly change the window size so we can calculate the scaling
    await this.setWindowSize(smallWidth, smallHeight);
    const bitmap2 = await this.getScreenshotAsBitmap();
    const bm2Data = await bitmap2.metadata();
    this.log.debug(
      `======browser======== actual second screenshot size width= ${bm2Data.width}, height=${bm2Data.height}`
    );

    const bm1Width = bm1Data.width ?? smallWidth;
    const bm1Height = bm1Data.height ?? smallHeight;
    const bm2Width = bm2Data.width ?? smallWidth;
    const bm2Height = bm2Data.height ?? smallHeight;

    const xScaling = (bm1Width - bm2Width) / smallWidth;
    const yScaling = (bm1Height - bm2Height) / smallHeight;
    const xBorder = Math.round(600 - bm2Width / xScaling);
    const yBorder = Math.round(400 - bm2Height / yScaling);

    this.log.debug(
      `======browser======== calculated values xBorder= ${xBorder}, yBorder=${yBorder}, xScaling=${xScaling}, yScaling=${yScaling}`
    );
    this.log.debug(
      `======browser======== setting browser size to ${width + xBorder} x ${height + yBorder}`
    );
    await this.setWindowSize(width + xBorder, height + yBorder);

    const bitmap3 = await this.getScreenshotAsBitmap();
    const bm3Data = await bitmap3.metadata();
    const bm3Width = bm3Data.width ?? width;
    const bm3Height = bm3Data.height ?? height;
    // when there is display scaling this won't show the expected size.  It will show expected size * scaling factor
    this.log.debug(
      `======browser======== final screenshot size width=${bm3Width}, height=${bm3Height}`
    );
  }

  /**
   * Gets the URL that is loaded in the focused window/frame.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#getCurrentUrl
   * @param relativeUrl (optional) set to true to return the relative URL (without the hostname and protocol)
   * @return {Promise<string>}
   */
  public async getCurrentUrl(relativeUrl: boolean = false): Promise<string> {
    // strip _t=Date query param when url is read
    const current = await this.driver.getCurrentUrl();
    const currentWithoutTime = modifyUrl(current, (parsed) => {
      delete (parsed.query as any)._t;
      return void 0;
    });

    if (relativeUrl) {
      const { path } = Url.parse(currentWithoutTime);
      return path!; // this property includes query params and anchors
    } else {
      return currentWithoutTime;
    }
  }

  /**
   * Uses the 'retry' service and waits for the current browser URL to match the provided path.
   * NB the provided path can contain query params as well as hash anchors.
   * Using retry logic makes URL assertions less flaky
   * @param expectedPath The relative path that we are expecting the browser to be on
   * @returns a Promise that will reject if the browser URL does not match the expected one
   */
  public async waitForUrlToBe(expectedPath: string) {
    const retry = await this.ctx.getService('retry');
    const log = this.ctx.getService('log');

    await retry.waitForWithTimeout(`URL to be ${expectedPath}`, 5000, async () => {
      const currentPath = await this.getCurrentUrl(true);

      if (currentPath !== expectedPath) {
        log.debug(`Expected URL to be ${expectedPath}, got ${currentPath}`);
      }
      return currentPath === expectedPath;
    });

    // wait some time before checking the URL again
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ensure the URL stays the same and we did not go through any redirects
    const currentPath = await this.getCurrentUrl(true);
    if (currentPath !== expectedPath) {
      throw new Error(`Expected URL to continue to be ${expectedPath}, got ${currentPath}`);
    }
  }

  /**
   * Gets the page/document title of the focused window/frame.
   * https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/chrome_exports_Driver.html#getTitle
   */
  public async getTitle() {
    return await this.driver.getTitle();
  }

  /**
   * Navigates the focused window/frame to a new URL.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/chrome_exports_Driver.html#get
   *
   * @param {string} url
   * @param {boolean} insertTimestamp Optional
   * @return {Promise<void>}
   */
  public async get(url: string, insertTimestamp: boolean = true) {
    if (insertTimestamp) {
      const urlWithTime = modifyUrl(url, (parsed) => {
        (parsed.query as any)._t = Date.now();
        return void 0;
      });

      return await this.driver.get(urlWithTime);
    }
    return await this.driver.get(url);
  }

  /**
   * Deletes all the cookies of the current browsing context.
   * https://www.selenium.dev/documentation/webdriver/interactions/cookies/#delete-all-cookies
   *
   * @return {Promise<void>}
   */
  public async deleteAllCookies() {
    await this.driver.manage().deleteAllCookies();
  }

  /**
   * Adds a cookie to the current browsing context. You need to be on the domain that the cookie will be valid for.
   * https://www.selenium.dev/documentation/webdriver/interactions/cookies/#add-cookie
   *
   * @param {string} name
   * @param {string} value
   * @return {Promise<void>}
   */
  public async setCookie(name: string, value: string) {
    await this.driver.manage().addCookie({ name, value });
  }

  /**
   * Retrieves the cookie with the given name. Returns null if there is no such cookie. The cookie will be returned as
   * a JSON object as described by the WebDriver wire protocol.
   * https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Options.html
   *
   * @param {string} cookieName
   * @return {Promise<IWebDriverCookie>}
   */
  public async getCookie(cookieName: string) {
    return await this.driver.manage().getCookie(cookieName);
  }

  /**
   * Returns a ‘successful serialized cookie data’ for current browsing context.
   * If browser is no longer available it returns error.
   * https://www.selenium.dev/documentation/webdriver/interactions/cookies/#get-all-cookies
   *
   * @param {string} cookieName
   * @return {Promise<IWebDriverCookie>}
   */
  public async getCookies() {
    return await this.driver.manage().getCookies();
  }

  /**
   * Pauses the execution in the browser, similar to setting a breakpoint for debugging.
   * @return {Promise<void>}
   */
  public async pause() {
    await this.driver.executeAsyncScript(`(async () => { debugger; return Promise.resolve(); })()`);
  }

  /**
   * Moves the remote environment’s mouse cursor to the specified point {x, y} which is
   * offset to browser page top left corner.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#move
   *
   * @param {x: number, y: number} point on browser page
   * @return {Promise<void>}
   */
  public async moveMouseTo(point: { x: number; y: number }): Promise<void> {
    await this.getActions().move({ x: 0, y: 0 }).perform();
    await this.getActions().move({ x: point.x, y: point.y, origin: Origin.POINTER }).perform();
  }

  /**
   * Does a drag-and-drop action from one point to another
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#dragAndDrop
   *
   * @return {Promise<void>}
   */
  public async dragAndDrop(
    from: {
      location: WebElementWrapper | { x?: number; y?: number };
      offset?: { x?: number; y?: number };
    },
    to: {
      location: WebElementWrapper | { x?: number; y?: number };
      offset?: { x?: number; y?: number };
    }
  ) {
    // The offset should be specified in pixels relative to the center of the element's bounding box
    const getW3CPoint = (data: any) => {
      if (!data.offset) {
        data.offset = {};
      }
      return data.location instanceof WebElementWrapper
        ? {
            x: data.offset.x || 0,
            y: data.offset.y || 0,
            origin: data.location._webElement,
          }
        : { x: data.location.x, y: data.location.y, origin: Origin.POINTER };
    };

    const startPoint = getW3CPoint(from);
    const endPoint = getW3CPoint(to);
    await this.getActions().move({ x: 0, y: 0 }).perform();
    return await this.getActions().move(startPoint).press().move(endPoint).release().perform();
  }

  /**
   * Performs drag and drop for html5 native drag and drop implementation
   * There's a bug in Chromedriver for html5 dnd that doesn't allow to use the method `dragAndDrop` defined above
   * https://github.com/SeleniumHQ/selenium/issues/6235
   * This implementation simulates user's action by calling the drag and drop specific events directly.
   *
   * @param {string} from html selector
   * @param {string} to html selector
   * @return {Promise<void>}
   */
  public async html5DragAndDrop(from: string, to: string) {
    await this.execute(
      `
        function createEvent(typeOfEvent) {
          const event = document.createEvent("CustomEvent");
          event.initCustomEvent(typeOfEvent, true, true, null);
          event.dataTransfer = {
            data: {},
            setData: function (key, value) {
              this.data[key] = value;
            },
            getData: function (key) {
              return this.data[key];
            }
          };
          return event;
        }
        function dispatchEvent(element, event, transferData) {
          if (transferData !== undefined) {
            event.dataTransfer = transferData;
          }
          if (element.dispatchEvent) {
            element.dispatchEvent(event);
          } else if (element.fireEvent) {
            element.fireEvent("on" + event.type, event);
          }
        }

        const origin = document.querySelector(arguments[0]);

        const dragStartEvent = createEvent('dragstart');
        dispatchEvent(origin, dragStartEvent);

        setTimeout(() => {
          const dropEvent = createEvent('drop');
          const target = document.querySelector(arguments[1]);
          dispatchEvent(target, dropEvent, dragStartEvent.dataTransfer);
          const dragEndEvent = createEvent('dragend');
          dispatchEvent(origin, dragEndEvent, dropEvent.dataTransfer);
        }, 100);
    `,
      from,
      to
    );
    // wait for 150ms to make sure the script has run
    await setTimeoutAsync(150);
  }

  /**
   * Reloads the current browser window/frame.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Navigation.html#refresh
   *
   * @return {Promise<void>}
   */
  public async refresh() {
    await this.driver.navigate().refresh();
  }

  /**
   * Navigates the focused window/frame back one page using the browser’s navigation history.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Navigation.html#back
   *
   * @return {Promise<void>}
   */
  public async goBack() {
    await this.driver.navigate().back();
  }

  /**
   * Moves forwards in the browser history.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Navigation.html#forward
   *
   * @return {Promise<void>}
   */
  public async goForward() {
    await this.driver.navigate().forward();
  }

  /**
   * Navigates to a URL via the browser history.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Navigation.html#to
   *
   * @return {Promise<void>}
   */
  public async navigateTo(url: string) {
    await this.driver.navigate().to(url);
  }

  /**
   * Sends a sequance of keyboard keys. For each key, this will record a pair of keyDown and keyUp actions
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#sendKeys
   *
   * @param  {string|string[]} keys
   * @return {Promise<void>}
   */
  public async pressKeys(keys: string | string[]): Promise<void>;
  public async pressKeys(...args: string[]): Promise<void>;
  public async pressKeys(...args: string[]): Promise<void> {
    const chord = this.keys.chord(...args);
    await this.getActions().sendKeys(chord).perform();
  }

  /**
   * Moves the remote environment’s mouse cursor to the specified point {x, y} which is
   * offset to browser page top left corner.
   * Then adds an action for left-click (down/up) with the mouse.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#click
   *
   * @param {x: number, y: number} point on browser page
   * @return {Promise<void>}
   */
  public async clickMouseButton(point: { x: number; y: number }) {
    await this.getActions().move({ x: 0, y: 0 }).perform();
    await this.getActions()
      .move({ x: point.x, y: point.y, origin: Origin.POINTER })
      .click()
      .perform();
  }

  /**
   * Gets the HTML loaded in the focused window/frame. This markup is serialised by the remote
   * environment so may not exactly match the HTML provided by the Web server.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#getPageSource
   *
   * @return {Promise<string>}
   */
  public async getPageSource() {
    return await this.driver.getPageSource();
  }

  /**
   * Gets a screenshot of the focused window and returns it as a base-64 encoded PNG
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#takeScreenshot
   *
   * @return {Promise<Buffer>}
   */
  public async takeScreenshot() {
    return await this.driver.takeScreenshot();
  }

  /**
   * Inserts action for performing a double left-click with the mouse.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#doubleClick
   * @param {WebElementWrapper} element
   * @return {Promise<void>}
   */
  public async doubleClick() {
    await this.getActions().doubleClick().perform();
  }

  /**
   * Changes the focus of all future commands to another window. Windows may be specified
   * by their window.name attributeor by its handle (as returned by WebDriver#getWindowHandles).
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_TargetLocator.html
   *
   * @param {string} handle
   * @return {Promise<void>}
   */
  public async switchToWindow(nameOrHandle: string) {
    await this.driver.switchTo().window(nameOrHandle);
  }

  /**
   * Gets a list of identifiers for all currently open windows.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#getAllWindowHandles
   *
   * @return {Promise<string[]>}
   */
  public async getAllWindowHandles() {
    return await this.driver.getAllWindowHandles();
  }

  /**
   * Switches driver to specific browser tab by index
   *
   * @param {string} tabIndex
   * @return {Promise<void>}
   */
  public async switchTab(tabIndex: number) {
    const tabs = await this.driver.getAllWindowHandles();
    if (tabs.length <= tabIndex) {
      throw new Error(`Out of existing tabs bounds`);
    }
    await this.driver.switchTo().window(tabs[tabIndex]);
  }

  /**
   * Opens a blank new tab.
   * @return {Promise<string>}
   */
  public async openNewTab() {
    await this.driver.switchTo().newWindow('tab');
  }

  /**
   * Sets a value in local storage for the focused window/frame.
   *
   * @param {string} key
   * @param {string} value
   * @return {Promise<void>}
   */
  public async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.driver.executeScript(
      'return window.localStorage.setItem(arguments[0], arguments[1]);',
      key,
      value
    );
  }

  /**
   * Removes a value in local storage for the focused window/frame.
   *
   * @param {string} key
   * @return {Promise<void>}
   */
  public async removeLocalStorageItem(key: string): Promise<void> {
    await this.driver.executeScript('return window.localStorage.removeItem(arguments[0]);', key);
  }

  /**
   * Clears all values in local storage for the focused window/frame.
   *
   * @return {Promise<void>}
   */
  public async clearLocalStorage(): Promise<void> {
    await this.driver.executeScript('return window.localStorage.clear();');
  }

  /**
   * Clears session storage for the focused window/frame.
   *
   * @return {Promise<void>}
   */
  public async clearSessionStorage(): Promise<void> {
    await this.driver.executeScript('return window.sessionStorage.clear();');
  }

  /**
   * Get from the "local storage" by key
   *
   * @param {string} key
   * @return {Promise<string>}
   */
  public async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.driver.executeScript<string>(`return window.localStorage.getItem("${key}");`);
  }

  /**
   * Closes the currently focused window. In most environments, after the window has been
   * closed, it is necessary to explicitly switch to whatever window is now focused.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#close
   *
   * @return {Promise<void>}
   */
  public async closeCurrentWindow() {
    await this.driver.close();
  }

  /**
   * Executes JavaScript code within the focused window/frame. The code should return a value synchronously.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#executeScript
   *
   * @param  {string|function} fn
   * @param  {...any[]} args
   */
  public async execute<A extends any[], R>(
    fn: string | ((...args: A) => R),
    ...args: A
  ): Promise<R> {
    return await this.driver.executeScript(
      fn,
      ...cloneDeepWith<any>(args, (arg) => {
        if (arg instanceof WebElementWrapper) {
          return arg._webElement;
        }
      })
    );
  }

  public async executeAsync<T = unknown>(fn: (cb: (value?: T) => void) => void): Promise<T>;
  public async executeAsync<T = unknown, A1 = unknown>(
    fn: (a1: A1, cb: (value?: T) => void) => void,
    a1: A1
  ): Promise<T>;
  public async executeAsync<T = unknown, A1 = unknown, A2 = unknown>(
    fn: (a1: A1, a2: A2, cb: (value?: T) => void) => void,
    a1: A1,
    a2: A2
  ): Promise<T>;
  public async executeAsync<T = unknown, A1 = unknown, A2 = unknown, A3 = unknown>(
    fn: (a1: A1, a2: A2, a3: A3, cb: (value?: T) => void) => void,
    a1: A1,
    a2: A2,
    a3: A3
  ): Promise<T>;
  public async executeAsync<T = unknown, A1 = unknown, A2 = unknown, A3 = unknown>(
    fn: string,
    ...args: any[]
  ): Promise<T>;
  public async executeAsync<T = unknown>(
    fn: string | ((...args: any[]) => void),
    ...args: any[]
  ): Promise<T> {
    return await this.driver.executeAsyncScript<T>(
      fn,
      ...cloneDeepWith<any>(args, (arg) => {
        if (arg instanceof WebElementWrapper) {
          return arg._webElement;
        }
      })
    );
  }

  public async getScrollTop() {
    const scrollSize = await this.driver.executeScript<string>('return document.body.scrollTop');
    return parseInt(scrollSize, 10);
  }

  public async getScrollLeft() {
    const scrollSize = await this.driver.executeScript<string>('return document.body.scrollLeft');
    return parseInt(scrollSize, 10);
  }

  public async scrollTop() {
    await this.driver.executeScript('document.documentElement.scrollTop = 0');
  }

  // return promise with REAL scroll position
  public async setScrollTop(scrollSize: number | string) {
    await this.driver.executeScript('document.body.scrollTop = ' + scrollSize);
    return this.getScrollTop();
  }

  public async setScrollToById(elementId: string, xCoord: number, yCoord: number) {
    await this.driver.executeScript(
      `document.getElementById("${elementId}").scrollTo(${xCoord},${yCoord})`
    );
  }

  public async setScrollLeft(scrollSize: number | string) {
    await this.driver.executeScript('document.body.scrollLeft = ' + scrollSize);
    return this.getScrollLeft();
  }

  public async switchToFrame(idOrElement: number | WebElementWrapper) {
    const _id = idOrElement instanceof WebElementWrapper ? idOrElement._webElement : idOrElement;
    await this.driver.switchTo().frame(_id);
  }

  public async checkBrowserPermission(permission: string): Promise<boolean> {
    const result: any = await this.driver.executeAsyncScript(
      `navigator.permissions.query({name:'${permission}'}).then(arguments[0])`
    );

    return Boolean(result?.state === 'granted');
  }

  public async getClipboardValue(): Promise<string> {
    return await this.driver.executeAsyncScript(
      'navigator.clipboard.readText().then(arguments[0])'
    );
  }

  /**
   * Checks if browser session is active and any browser window exists
   * @returns {Promise<boolean>}
   */
  public async hasOpenWindow(): Promise<boolean> {
    if (this.driver == null) {
      return false;
    } else {
      try {
        const windowHandles = await this.driver.getAllWindowHandles();
        return windowHandles.length > 0;
      } catch (err) {
        if (err instanceof NoSuchSessionError) {
          // https://developer.mozilla.org/en-US/docs/Web/WebDriver/Errors/InvalidSessionID
          this.log.error(
            `WebDriver session is no longer valid.\nProbably Chrome process crashed when it tried to use more memory than what was available.`
          );
          // TODO: Remove this after a while. We are enabling richer logs in order to try catch the real error cause.
          this.log.error(
            `Original Error Logging.\n Name: ${err.name};\n Message: ${err.message};\n Stack: ${
              err.stack
            }\n RemoteStack: ${(err as NoSuchSessionError).remoteStacktrace}`
          );
        }
        return false;
      }
    }
  }

  /**
   * Get the network simulation for chromium browsers if available.
   * https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/chrome_exports_Driver.html#getNetworkConditions
   *
   * @return {Promise<NetworkOptions>}
   */
  public async getNetworkConditions() {
    if (this.isChromium()) {
      return this.driver.getNetworkConditions().catch(() => undefined); // Return undefined instead of throwing if no conditions are set.
    } else {
      const message =
        'WebDriver does not support the .getNetworkConditions method.\nProbably the browser in used is not chromium based.';
      this.log.error(message);
      throw new Error(message);
    }
  }

  /**
   * Delete the network simulation for chromium browsers if available.
   *
   * @return {Promise<void>}
   */
  public async restoreNetworkConditions() {
    this.log.debug('Restore network conditions simulation.');
    return this.setNetworkConditions('NO_THROTTLING');
  }

  /**
   * Set the network conditions for chromium browsers if available.
   *
   * __Sample Usage:__
   *
   * browser.setNetworkConditions('FAST_3G')
   * browser.setNetworkConditions('SLOW_3G')
   * browser.setNetworkConditions('OFFLINE')
   * browser.setNetworkConditions({
   *   offline: false,
   *   latency: 5, // Additional latency (ms).
   *   download_throughput: 500 * 1024, // Maximal aggregated download throughput.
   *   upload_throughput: 500 * 1024, // Maximal aggregated upload throughput.
   * });
   *
   * https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/chrome_exports_Driver.html#setNetworkConditions
   *
   * @return {Promise<void>}
   */
  public async setNetworkConditions(profileOrOptions: NetworkProfile | NetworkOptions) {
    const networkOptions = isString(profileOrOptions)
      ? NETWORK_PROFILES[profileOrOptions]
      : profileOrOptions;

    if (this.isChromium()) {
      this.log.debug(`Set network conditions with profile "${profileOrOptions}".`);
      return this.driver.setNetworkConditions(networkOptions);
    } else {
      const message =
        'WebDriver does not support the .setNetworkCondition method.\nProbably the browser in used is not chromium based.';
      this.log.error(message);
      throw new Error(message);
    }
  }
}

export async function BrowserProvider(ctx: FtrProviderContext) {
  const { driver, browserType } = await ctx.getService('__webdriver__').init();
  return new BrowserService(ctx, browserType, driver);
}
