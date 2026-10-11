/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

/** Returns normalized full text and label lines for decorated combobox options. */
export const getComboBoxOptionTextCandidates = (
  text: string,
  requestedValue?: string
): string[] => {
  const normalize = (value: string) => value.toLowerCase().trim();
  return [
    ...new Set([
      normalize(text),
      ...text.split('\n').map(normalize),
      ...(requestedValue === undefined ? [] : [normalize(requestedValue)]),
    ]),
  ].filter(Boolean);
};

/** Matches option labels and decorations while preserving prefix shorthand selection. */
export const findMatchingComboBoxOption = <Option extends { text: string }>(
  options: readonly Option[],
  value: string
): Option | undefined => {
  const normalizedValue = value.toLowerCase().trim();
  if (!normalizedValue) return;

  const candidates = options.map((option) => ({
    option,
    texts: getComboBoxOptionTextCandidates(option.text),
  }));
  const exact = candidates.find(({ texts }) => texts.includes(normalizedValue));
  if (exact) return exact.option;

  const prefix = candidates.filter(({ texts }) =>
    texts.some((text) => text.startsWith(normalizedValue))
  );
  const boundaryMatch = prefix.find(({ texts }) =>
    texts.some(
      (text) =>
        text.startsWith(normalizedValue) &&
        /^[^\p{L}\p{N}_]/u.test(text.slice(normalizedValue.length))
    )
  );
  const prefixMatch = boundaryMatch?.option ?? prefix[0]?.option;
  if (prefixMatch) return prefixMatch;

  // EUI searches inside labels and treats separate words as search terms, so
  // callers can use "k" for ".kibana" or "resource name" for "resource.name".
  const searchTerms = normalizedValue.split(/\s+/);
  return candidates.find(({ texts }) =>
    texts.some((text) => searchTerms.every((term) => text.includes(term)))
  )?.option;
};

/**
 * wrapper around EuiComboBox interactions
 */
export class ComboBoxService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly common = this.ctx.getPageObject('common');

  private readonly WAIT_FOR_EXISTS_TIME: number = this.config.get('timeouts.waitForExists');
  private readonly findTimeout: number = this.config.get('timeouts.find');

  /**
   * Finds combobox element and sets specified value
   *
   * @param comboBoxSelector data-test-subj selector
   * @param value option text
   * @param options optional configuration
   * @param options.maxRetries maximum number of retry attempts (default: 0)
   */

  public async set(
    comboBoxSelector: string,
    value: string,
    options: { retryCount?: number } = {}
  ): Promise<void> {
    const { retryCount = 0 } = options;
    this.log.debug(
      `comboBox.set, comboBoxSelector: ${comboBoxSelector}, retryCount: ${retryCount}`
    );
    if (retryCount < 1) {
      const comboBox = await this.testSubjects.find(comboBoxSelector);
      await this.setElement(comboBox, value);
    } else {
      await this.retry.tryWithRetries(
        `comboBox.set, comboBoxSelector: ${comboBoxSelector}`,
        async () => {
          const comboBox = await this.testSubjects.find(comboBoxSelector);
          await this.setElement(comboBox, value);
        },
        { retryCount, retryDelay: 1000 }
      );
    }
  }

  public async setForLastInput(comboBoxSelector: string, value: string): Promise<void> {
    this.log.debug(`comboBox.set, comboBoxSelector: ${comboBoxSelector}`);
    const comboBox = await this.find.byXPath(
      `(//*[@data-test-subj='${comboBoxSelector}'])[last()]`
    );
    await this.setElement(comboBox, value);
  }

  /**
   * Clicks the option matching `trimmedValue` in the combobox dropdown
   *
   * @param isMouseClick if 'true', click will be done with mouse
   * @param trimmedValue normalized option text to match; when undefined, the first option is clicked
   */
  private async clickOption(isMouseClick: boolean, trimmedValue?: string): Promise<string> {
    // Async option providers can commit after their spinner disappears. Poll the
    // options without typing again, which would restart a debounced search.
    const element = await this.retry.tryForTime(this.findTimeout, () =>
      this.findOption(trimmedValue)
    );
    const selectedText = await element.getVisibleText();
    // Native click avoids scrolling that can close the dropdown.
    if (isMouseClick) {
      await element.clickMouseButton();
    } else {
      await element._webElement.click();
    }
    return selectedText;
  }

  /**
   * Finds the option element matching `trimmedValue` in the currently open combobox dropdown
   *
   * @param trimmedValue normalized option text to match; when undefined, the first option is returned
   */
  private async findOption(trimmedValue?: string): Promise<WebElementWrapper> {
    if (trimmedValue === undefined) {
      return await this.find.byCssSelector('.euiComboBoxOption');
    }

    // Find options by visible text content.
    const optionsWithText = await Promise.all(
      (
        await this.find.allByCssSelector(`.euiComboBoxOption`, 0)
      ).map(async (e) => {
        const text = (await e.getVisibleText()) ?? '';
        return { element: e, text };
      })
    );

    const match = findMatchingComboBoxOption(optionsWithText, trimmedValue);
    if (match) {
      return match.element;
    }

    throw new Error(
      `Combobox option "${trimmedValue}" is not available; available options: ${optionsWithText
        .map(({ text }) => text)
        .join(', ')}`
    );
  }

  /**
   * Finds combobox element options
   *
   * @param comboBoxSelector data-test-subj selector
   */
  public async getOptions(comboBoxSelector: string) {
    const comboBoxElement = await this.testSubjects.find(comboBoxSelector);
    await this.openOptionsList(comboBoxElement);
    return await this.find.allByCssSelector('.euiComboBoxOption', this.WAIT_FOR_EXISTS_TIME);
  }

  /**
   * Sets value for specified combobox element
   *
   * @param comboBoxElement element that wraps up EuiComboBox
   * @param value
   */
  public async setElement(
    comboBoxElement: WebElementWrapper,
    value: string,
    options = { clickWithMouse: false }
  ): Promise<void> {
    const trimmedValue = value.toLowerCase().trim();
    let selectedText = value;
    this.log.debug(`comboBox.setElement, value: ${trimmedValue}`);
    await this.retry.try(async () => {
      if (await this.isRenderedOptionSelected(comboBoxElement, selectedText, value)) {
        this.log.debug('value is already selected. returning');
        return;
      }

      await comboBoxElement.scrollIntoViewIfNecessary();
      await this.setFilterValue(comboBoxElement, value);
      await this.openOptionsList(comboBoxElement);
      selectedText = await this.clickOption(options.clickWithMouse, trimmedValue);
      await this.closeOptionsList(comboBoxElement);
      // Async selections can disable the input before committing the selected label.
      // Wait for that commit without restarting the selection or typing again.
      await this.retry.try(async () => {
        expect(await this.isRenderedOptionSelected(comboBoxElement, selectedText, value)).to.equal(
          true
        );
      });
    });
  }

  private async isRenderedOptionSelected(
    comboBoxElement: WebElementWrapper,
    text: string,
    requestedValue: string
  ): Promise<boolean> {
    for (const candidate of getComboBoxOptionTextCandidates(text, requestedValue)) {
      if (
        await this.isOptionSelected(comboBoxElement, candidate, {
          allowInvalid: true,
          allowMultiple: true,
        })
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Finds combobox element and sets custom value
   * It applies changes by pressing Enter key. Sometimes it may lead to auto-submitting a form.
   *
   * @param comboBoxSelector data-test-subj selector
   * @param value option text
   */
  public async setCustom(comboBoxSelector: string, value: string): Promise<void> {
    const comboBoxElement = await this.testSubjects.find(comboBoxSelector);
    await this.setFilterValue(comboBoxElement, value);
    await this.common.pressEnterKey();
    await this.closeOptionsList(comboBoxElement);
  }

  /**
   * Finds combobox element and sets filter value
   *
   * @param comboBoxSelector data-test-subj selector
   * @param filterValue text
   */
  public async filterOptionsList(comboBoxSelector: string, filterValue: string): Promise<void> {
    this.log.debug(
      `comboBox.filterOptionsList, comboBoxSelector: ${comboBoxSelector}, filter: ${filterValue}`
    );
    const comboBox = await this.testSubjects.find(comboBoxSelector);
    await this.setFilterValue(comboBox, filterValue);
    await this.closeOptionsList(comboBox);
  }

  /**
   * Sets new filter value in specified combobox element
   *
   * @param comboBoxElement element that wraps up EuiComboBox
   * @param filterValue text
   */
  public async setFilterValue(
    comboBoxElement: WebElementWrapper,
    filterValue: string
  ): Promise<void> {
    // Re-resolve the input on each attempt: combobox re-renders, staling a captured
    // handle so that retrying type on a fixed reference cannot recover.
    await this.retry.try(async () => {
      const input = await comboBoxElement.findByTagName('input');
      expect(await input.isEnabled()).to.equal(true);

      // Some Kibana comboboxes force state to not be clearable, so we can't use `input.clearValue()`.
      // This is not-great production UX and shouldn't be happening, but for now we're going to
      // work around it in FTR tests by selecting all existing text and typing to replace
      if (!!(await input.getAttribute('value'))) {
        await input.selectValueWithKeyboard();
      }
      await input.type(filterValue);
      await this.waitForOptionsListLoading(comboBoxElement);

      expect(await input.getAttribute('value')).to.equal(filterValue);
    });
  }

  /**
   * Waits options list to be loaded
   *
   * @param comboBoxElement element that wraps up EuiComboBox
   */
  private async waitForOptionsListLoading(comboBoxElement: WebElementWrapper): Promise<void> {
    await comboBoxElement.waitForDeletedByCssSelector('.euiLoadingSpinner', 50);
  }

  /**
   * Returns options list as a single string
   *
   * @param comboBoxSelector data-test-subj selector
   */
  public async getOptionsList(comboBoxSelector: string): Promise<string> {
    this.log.debug(`comboBox.getOptionsList, comboBoxSelector: ${comboBoxSelector}`);
    const comboBox = await this.testSubjects.find(comboBoxSelector);
    const menu = await this.retry.try(async () => {
      await this.testSubjects.click(comboBoxSelector);
      await this.waitForOptionsListLoading(comboBox);
      const isOptionsListOpen = await this.testSubjects.exists('~comboBoxOptionsList');
      if (!isOptionsListOpen) {
        throw new Error('Combo box options list did not open on click');
      }
      return await this.testSubjects.find('~comboBoxOptionsList');
    });
    const optionsText = await menu.getVisibleText();
    await this.closeOptionsList(comboBox);
    return optionsText;
  }

  /**
   * Finds combobox element and checks if it has selected options
   *
   * @param comboBoxSelector data-test-subj selector
   */
  public async doesComboBoxHaveSelectedOptions(comboBoxSelector: string): Promise<boolean> {
    this.log.debug(
      `comboBox.doesComboBoxHaveSelectedOptions, comboBoxSelector: ${comboBoxSelector}`
    );
    const comboBox = await this.testSubjects.find(comboBoxSelector);
    const $ = await comboBox.parseDomContent();
    return $('.euiComboBoxPill').toArray().length > 0;
  }

  /**
   * Returns selected options
   * @param comboBoxSelector data-test-subj selector
   */
  public async getComboBoxSelectedOptions(comboBoxSelector: string): Promise<string[]> {
    this.log.debug(`comboBox.getComboBoxSelectedOptions, comboBoxSelector: ${comboBoxSelector}`);
    const comboBox = await this.testSubjects.find(comboBoxSelector);
    const $ = await comboBox.parseDomContent();

    if (await this.isSingleSelectionPlainText(comboBox)) {
      const input = $('[data-test-subj="comboBoxSearchInput"]');
      this.log.debug('Single selection value: ', input.val());

      const isValid = input.attr('aria-invalid') !== 'true';

      if (isValid) {
        const value = input.val();
        return value ? [value] : []; // Don't return empty strings
      } else {
        this.log.debug(
          'Single selection value is not valid and thus not selected - returning empty array'
        );
        return [];
      }
    }

    const options = $('.euiComboBoxPill')
      .toArray()
      .map((option) => $(option).text());

    return options;
  }

  /**
   * Finds combobox element and clears value in the input field by clicking clear button
   *
   * @param comboBoxSelector data-test-subj selector
   */
  public async clear(comboBoxSelector: string): Promise<void> {
    this.log.debug(`comboBox.clear, comboBoxSelector:${comboBoxSelector}`);
    const comboBox = await this.testSubjects.find(comboBoxSelector);
    await this.retry.try(async () => {
      const clearButtonExists = await this.doesClearButtonExist(comboBox);
      if (!clearButtonExists) {
        this.log.debug('Unable to clear comboBox, comboBoxClearButton does not exist');
        return;
      }

      const clearBtn = await comboBox.findByTestSubject('comboBoxClearButton');
      await clearBtn.click();

      const clearButtonStillExists = await this.doesClearButtonExist(comboBox);
      if (clearButtonStillExists) {
        throw new Error('Failed to clear comboBox');
      }
    });
    await this.closeOptionsList(comboBox);
  }

  public async doesClearButtonExist(comboBoxElement: WebElementWrapper): Promise<boolean> {
    const found = await comboBoxElement.findAllByTestSubject(
      'comboBoxClearButton',
      this.WAIT_FOR_EXISTS_TIME
    );
    return found.length > 0;
  }

  public async checkValidity(comboBoxElement: WebElementWrapper): Promise<boolean> {
    const invalidClassName = 'euiComboBox-isInvalid';

    return !(await comboBoxElement.elementHasClass(invalidClassName));
  }

  /**
   * Closes options list
   *
   * @param comboBoxElement element that wraps up EuiComboBox
   */
  public async closeOptionsList(comboBoxElement: WebElementWrapper): Promise<void> {
    this.log.debug('comboBox.closeOptionsList');

    if (!(await this.testSubjects.exists('~comboBoxOptionsList'))) {
      return;
    }

    // Wait for closing animations only while the list is still open.
    const isOptionListClosed = await this.retry.tryWithRetries(
      'wait for possible ongoing closing of the combobox listbox',
      async () => {
        const isOpen = await this.testSubjects.exists('~comboBoxOptionsList');

        return !isOpen;
      },
      {
        timeout: 5000,
        initialDelay: 500,
        retryCount: 3,
      }
    );

    if (!isOptionListClosed) {
      // The input may be temporarily disabled or re-rendered (e.g. an auto-save triggered by a
      // just-committed value), so re-resolve it on each attempt and verify the list is gone.
      await this.retry.try(async () => {
        const input = await comboBoxElement.findByTagName('input');
        await input.pressKeys(this.browser.keys.ESCAPE);
        await this.testSubjects.missingOrFail('~comboBoxOptionsList', { timeout: 1000 });
      });
    }
  }

  /**
   * Opens options list
   *
   * @param comboBoxElement element that wraps up EuiComboBox
   */
  public async openOptionsList(comboBoxElement: WebElementWrapper): Promise<void> {
    this.log.debug('comboBox.openOptionsList');
    const isOptionsListOpen = await this.testSubjects.exists('~comboBoxOptionsList');

    if (!isOptionsListOpen) {
      await this.retry.try(async () => {
        const inputWrapper = await this.getComboBoxInputWrapper(comboBoxElement);
        await inputWrapper.click();
      });
    }
  }

  /**
   * Checks if specified option is already selected
   *
   * @param comboBoxElement element that wraps up EuiComboBox
   * @param value option text
   */
  public async isOptionSelected(
    comboBoxElement: WebElementWrapper,
    value: string,
    {
      allowInvalid = false,
      allowMultiple = false,
    }: {
      allowInvalid?: boolean;
      allowMultiple?: boolean;
    } = {}
  ): Promise<boolean> {
    this.log.debug(`comboBox.isOptionSelected, value: ${value}`);
    const $ = await comboBoxElement.parseDomContent();

    if (await this.isSingleSelectionPlainText(comboBoxElement)) {
      const input = $('input[role="combobox"]');

      const hasValidValue =
        input.attr('aria-expanded') !== 'true' &&
        (allowInvalid || input.attr('aria-invalid') !== 'true') &&
        value.toLowerCase().trim() === input.val().toLowerCase().trim(); // Normalizing text here for Firefox driver shenanigans

      return !!hasValidValue;
    }

    const selectedOptions = $('.euiComboBoxPill')
      .toArray()
      .map((option) => $(option).text());

    return (
      (allowMultiple || selectedOptions.length === 1) &&
      selectedOptions.some((option) => option.toLowerCase().trim() === value.toLowerCase().trim())
    );
  }

  /**
   * Clears input field
   * @param comboBoxSelector data-test-subj selector
   */
  public async clearInputField(comboBoxSelector: string): Promise<void> {
    this.log.debug(`comboBox.clearInputField, comboBoxSelector:${comboBoxSelector}`);
    const comboBoxElement = await this.testSubjects.find(comboBoxSelector);
    const input = await comboBoxElement.findByTagName('input');
    await input.clearValueWithKeyboard();
  }

  public async clearLastInputField(comboBoxSelector: string): Promise<void> {
    this.log.debug(`comboBox.clearInputField, comboBoxSelector:${comboBoxSelector}`);
    const comboBox = await this.find.byXPath(
      `(//*[@data-test-subj='${comboBoxSelector}'])[last()]`
    );
    const input = await comboBox.findByTagName('input');
    await input.clearValueWithKeyboard();
  }

  public async isDisabled(comboBoxElement: WebElementWrapper): Promise<boolean> {
    this.log.debug(`comboBox.isDisabled`);
    const toggleListButton = await comboBoxElement.findByTestSubject('comboBoxToggleListButton');
    const isDisabled = await toggleListButton.getAttribute('disabled');
    this.log.debug(`isDisabled:${isDisabled}`);
    return isDisabled?.toLowerCase() === 'true';
  }

  /**
   * Single selection plain text comboboxes do not render pill text, but instead render
   * selected as well as search values in the child <input>
   */
  private async isSingleSelectionPlainText(comboBoxElement: WebElementWrapper): Promise<boolean> {
    const inputWrapper = await this.getComboBoxInputWrapper(comboBoxElement);
    return await inputWrapper.elementHasClass('euiComboBox__inputWrap--plainText');
  }

  /**
   * Kibana devs sometimes pass in the `comboBoxInput` element and not the parent wrapper 🤷
   * This util accounts for that and returns the `data-test-subj="comboBoxInput"` element no matter what
   */
  private async getComboBoxInputWrapper(
    comboBoxElement: WebElementWrapper
  ): Promise<WebElementWrapper> {
    const isInputWrapper = await comboBoxElement.elementHasClass('euiComboBox__inputWrap');
    return isInputWrapper
      ? comboBoxElement
      : await comboBoxElement.findByTestSubject('comboBoxInput');
  }
}
