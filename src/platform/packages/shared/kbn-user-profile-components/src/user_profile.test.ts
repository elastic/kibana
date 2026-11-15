/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getUserAvatarInitials,
  isValidUserProfileAvatarInitials,
  USER_AVATAR_MAX_INITIALS_CODE_UNITS,
} from './user_profile';

const THUMBS_UP = '\u{1F44D}';
const THUMBS_UP_MEDIUM = '\u{1F44D}\u{1F3FD}';
const DEVANAGARI_KSSA = 'क्ष';
const KISS_WITH_SKIN_TONES = '\u{1F468}\u{1F3FB}‍❤️‍\u{1F48B}‍\u{1F468}\u{1F3FC}';
const E_ACUTE_COMBINING = 'é';

describe('isValidUserProfileAvatarInitials', () => {
  it.each([
    ['empty', ''],
    ['one letter', 'A'],
    ['two letters', 'AB'],
    ['one emoji', THUMBS_UP],
    ['one emoji with a skin tone', THUMBS_UP_MEDIUM],
    ['two emoji with skin tones', `${THUMBS_UP_MEDIUM}${THUMBS_UP_MEDIUM}`],
    ['a letter and an emoji', `A${THUMBS_UP}`],
    ['a Devanagari conjunct', DEVANAGARI_KSSA],
    ['a combining sequence and a letter', `${E_ACUTE_COMBINING}x`],
    ['two long ZWJ sequences', `${KISS_WITH_SKIN_TONES}${KISS_WITH_SKIN_TONES}`],
  ])('accepts %s', (_, initials) => {
    expect(isValidUserProfileAvatarInitials(initials)).toBe(true);
  });

  it.each([
    ['three letters', 'ABC'],
    ['three emoji', `${THUMBS_UP}${THUMBS_UP}${THUMBS_UP}`],
    ['two emoji and a letter', `${THUMBS_UP_MEDIUM}${THUMBS_UP_MEDIUM}A`],
  ])('rejects %s', (_, initials) => {
    expect(isValidUserProfileAvatarInitials(initials)).toBe(false);
  });

  it('rejects a single grapheme over the code unit cap', () => {
    const initials = `a${'́'.repeat(USER_AVATAR_MAX_INITIALS_CODE_UNITS)}`;

    expect(isValidUserProfileAvatarInitials(initials)).toBe(false);
  });
});

describe('getUserAvatarInitials', () => {
  it('returns initials from the avatar when present', () => {
    expect(
      getUserAvatarInitials({ username: 'jdoe', full_name: 'Jane Doe' }, { initials: 'ZZ' })
    ).toBe('ZZ');
  });

  it('returns the first character of the first two words of the display name', () => {
    expect(getUserAvatarInitials({ username: 'jdoe', full_name: 'Jane Middle Doe' })).toBe('JM');
  });

  it('returns the first character of a single-word display name', () => {
    expect(getUserAvatarInitials({ username: 'jdoe' })).toBe('j');
  });

  it('keeps the first grapheme of each word whole', () => {
    expect(
      getUserAvatarInitials({
        username: 'bot',
        full_name: `${THUMBS_UP_MEDIUM}Bot ${DEVANAGARI_KSSA}a`,
      })
    ).toBe(`${THUMBS_UP_MEDIUM}${DEVANAGARI_KSSA}`);
  });
});
