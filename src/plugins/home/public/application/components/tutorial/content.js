/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Markdown } from '../../../../../kibana_react/public';

const whiteListedRules = ['backticks', 'emphasis', 'link', 'list'];

export function Content({ text }) {
  return (
    <Markdown
      className="euiText"
      markdown={text}
      openLinksInNewTab={true}
      whiteListedRules={whiteListedRules}
    />
  );
}

Content.propTypes = {
  text: PropTypes.string.isRequired,
};
