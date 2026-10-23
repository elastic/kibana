/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  assertConnectorSucceeded,
  escapeHitlEmailLinkLabel,
  escapeHitlEmailMarkdown,
  escapeServiceNowCommentText,
  escapeSlackMrkdwnLabel,
  escapeSlackMrkdwnText,
  escapeTeamsHtml,
  fitHitlTextPreservingSuffix,
  fitSlackMrkdwnSectionText,
  SERVICENOW_COMMENT_MAX_LENGTH,
  serviceNowCommentLink,
  SLACK_SECTION_TEXT_MAX_LENGTH,
  slackApiChannelTarget,
  TEAMS_CONTENT_MAX_LENGTH,
  teamsHtmlLink,
} from './hitl_connector_helpers';

describe('assertConnectorSucceeded', () => {
  it('does not throw when status is ok', () => {
    expect(() => assertConnectorSucceeded({ status: 'ok' })).not.toThrow();
  });

  it('prefers serviceMessage over the generic connector message', () => {
    expect(() =>
      assertConnectorSucceeded({
        status: 'error',
        message: 'error posting slack message',
        serviceMessage:
          'One or more provided channels are not included in the allowed channels list',
      })
    ).toThrow('One or more provided channels are not included in the allowed channels list');
  });

  it('falls back to message when serviceMessage is missing', () => {
    expect(() =>
      assertConnectorSucceeded({
        status: 'error',
        message: 'Slack unavailable',
      })
    ).toThrow('Slack unavailable');
  });
});

describe('slackApiChannelTarget', () => {
  it('routes #names to channelNames', () => {
    expect(slackApiChannelTarget('#alerts')).toEqual({ channelNames: ['#alerts'] });
  });

  it('routes other values to channelIds', () => {
    expect(slackApiChannelTarget('C0123456789')).toEqual({ channelIds: ['C0123456789'] });
  });
});

describe('escapeServiceNowCommentText', () => {
  it('escapes HTML and journal code tags in comment text', () => {
    expect(escapeServiceNowCommentText('Host <your_input> [code]x[/code] & "q"')).toBe(
      'Host \uFF1Cyour_input\uFF1E [\u200bcode]x[\u200b/code] & "q"'
    );
  });
});

describe('serviceNowCommentLink', () => {
  it('keeps the journal anchor and escapes the label', () => {
    expect(serviceNowCommentLink('Approve[/code]', 'https://example.com?a=1&b=2')).toBe(
      '[code]<a href="https://example.com?a=1&amp;b=2">Approve[\u200b/code]</a>[/code]'
    );
  });
});

describe('fitHitlTextPreservingSuffix', () => {
  const suffix = 'Approve: https://kibana.example/approve\nDecline: https://kibana.example/reject';

  it('shortens the prompt so the links still fit the connector limit', () => {
    const comment = fitHitlTextPreservingSuffix(
      'a'.repeat(SERVICENOW_COMMENT_MAX_LENGTH),
      suffix,
      SERVICENOW_COMMENT_MAX_LENGTH
    );
    const content = fitHitlTextPreservingSuffix(
      'a'.repeat(TEAMS_CONTENT_MAX_LENGTH),
      suffix,
      TEAMS_CONTENT_MAX_LENGTH
    );

    expect(comment.length).toBe(SERVICENOW_COMMENT_MAX_LENGTH);
    expect(comment.endsWith(suffix)).toBe(true);
    expect(content.length).toBe(TEAMS_CONTENT_MAX_LENGTH);
    expect(content.endsWith(suffix)).toBe(true);
  });

  it('throws when the links alone exceed the limit', () => {
    expect(() => fitHitlTextPreservingSuffix('prompt', 'x'.repeat(11), 10)).toThrow(
      'exceed the 10 character connector limit'
    );
  });
});

describe('generated notification text', () => {
  it('escapes email markdown link syntax and keeps a scheme URL from autolinking', () => {
    expect(escapeHitlEmailMarkdown('See [click](https://evil.example)')).toBe(
      'See \\[click\\](https:\u2060//evil.example)'
    );
    expect(escapeHitlEmailMarkdown('ship (prod)')).toBe('ship (prod)');
    expect(escapeHitlEmailMarkdown('C:\\temp')).toBe('C:\\temp');
    expect(escapeHitlEmailMarkdown('a < b')).toBe('a < b');
    expect(escapeHitlEmailMarkdown('<https://evil.example>')).toBe(
      '\\<https:\u2060//evil.example>'
    );
    expect(escapeHitlEmailMarkdown('<mailto:a@b.co>')).toBe('\\<mailto:a@b.co>');
    expect(escapeHitlEmailLinkLabel('Approve\\')).toBe('Approve\\\\');
    expect(escapeHitlEmailMarkdown('is https://elastic.co a valid indicator')).toBe(
      'is https:\u2060//elastic.co a valid indicator'
    );
    expect(escapeHitlEmailMarkdown('see www.elastic.co')).toBe('see www.elastic.co');
    expect(escapeHitlEmailMarkdown('```\n~~~')).toBe('\\`\\`\\`\n\\~\\~\\~');
    expect(escapeHitlEmailMarkdown('\\[Approve\\](//evil.example)')).toBe(
      '\\[Approve\\](/\u2060/evil.example)'
    );
    expect(escapeHitlEmailMarkdown('\\\\[Approve](//evil.example)')).toBe(
      '\\\\\\[Approve\\](/\u2060/evil.example)'
    );
    expect(escapeHitlEmailMarkdown('//evil.example')).toBe('/\u2060/evil.example');
    expect(escapeHitlEmailMarkdown('\\'.repeat(8))).toBe('\\'.repeat(8));
    expect(escapeHitlEmailMarkdown(`${'\\'.repeat(8)}[`)).toBe(`${'\\'.repeat(9)}[`);
    expect(escapeHitlEmailMarkdown(`${'\\'.repeat(7)}[`)).toBe(`${'\\'.repeat(7)}[`);
  });

  it('escapes Slack mrkdwn link syntax and keeps a scheme URL from autolinking', () => {
    expect(escapeSlackMrkdwnText('See <https://evil.example|click> & more')).toBe(
      'See &lt;https:\u2060//evil.example|click&gt; &amp; more'
    );
    expect(escapeSlackMrkdwnText('Hey <@U123> <#C123> <!here> <mailto:a@b.co|Approve>')).toBe(
      'Hey <@U123> <#C123> <!here> &lt;mailto:a@b.co|Approve&gt;'
    );
    expect(escapeSlackMrkdwnText('see //evil.example')).toBe('see /\u2060/evil.example');
  });

  it('shortens an escaped Slack section to the API limit without splitting an entity', () => {
    const withinLimit = 'a'.repeat(SLACK_SECTION_TEXT_MAX_LENGTH);
    expect(fitSlackMrkdwnSectionText(withinLimit)).toBe(withinLimit);

    const splitEntity = `${'a'.repeat(SLACK_SECTION_TEXT_MAX_LENGTH - 2)}&amp;`;
    expect(fitSlackMrkdwnSectionText(splitEntity)).toBe(
      'a'.repeat(SLACK_SECTION_TEXT_MAX_LENGTH - 2)
    );

    const keptEntity = `${'b'.repeat(SLACK_SECTION_TEXT_MAX_LENGTH - 4)}&lt;tail`;
    expect(fitSlackMrkdwnSectionText(keptEntity)).toBe(
      `${'b'.repeat(SLACK_SECTION_TEXT_MAX_LENGTH - 4)}&lt;`
    );
  });

  it('keeps a Slack link label from splitting the generated link', () => {
    expect(escapeSlackMrkdwnLabel('Approve|https://evil.example')).toBe(
      'Approve\uff5chttps:\u2060//evil.example'
    );
    expect(escapeSlackMrkdwnLabel('Approve\nhttps://evil.example')).toBe(
      'Approve https:\u2060//evil.example'
    );
    expect(escapeSlackMrkdwnLabel('<@U123>')).toBe('&lt;@U123&gt;');
  });
});

describe('teamsHtmlLink', () => {
  it('escapes the step text and keeps the href intact', () => {
    expect(escapeTeamsHtml('Host <web-01> & "q"')).toBe('Host &lt;web-01&gt; &amp; &quot;q&quot;');
    expect(teamsHtmlLink('Approve', 'https://kibana.example/resume?token=abc&approved=true')).toBe(
      '<a href="https://kibana.example/resume?token=abc&amp;approved=true">Approve</a>'
    );
  });
});
