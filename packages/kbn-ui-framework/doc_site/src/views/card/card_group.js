/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';

import {
  KuiCardGroup,
  KuiCard,
  KuiCardDescription,
  KuiCardDescriptionTitle,
  KuiCardDescriptionText,
  KuiCardFooter,
  KuiLinkButton
} from '../../../../components';

export default () => {
  /**
   * These styles are just for demonstration purposes. It is recommended to use
   * properly named classes to set the width in production code.
   */
  const cardStyle = {
    width: '400px'
  };

  return (
    <div>
      <KuiCardGroup>
        <KuiCard style={cardStyle}>
          <KuiCardDescription>
            <KuiCardDescriptionTitle>
              Get a banana
            </KuiCardDescriptionTitle>

            <KuiCardDescriptionText>
              Bananas are yellow, fit easily in the hand, and have a lot of potassium or something.
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <KuiLinkButton
              buttonType="basic"
              href="#"
            >
              Banana!
            </KuiLinkButton>
          </KuiCardFooter>
        </KuiCard>

        <KuiCard style={cardStyle}>
          <KuiCardDescription>
            <KuiCardDescriptionTitle>
              Get a pteradactyl
            </KuiCardDescriptionTitle>

            <KuiCardDescriptionText>
              Pteradactyls can fly, like to squawk all the time, and are difficult to spell correctly.
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <KuiLinkButton
              buttonType="primary"
              href="https://www.elastic.co/subscriptions/xpack"
              target="_blank"
            >
              Pteradactyl!
            </KuiLinkButton>
          </KuiCardFooter>
        </KuiCard>

        <KuiCard style={cardStyle}>
          <KuiCardDescription>
            <KuiCardDescriptionTitle>
              Get a magnolia tree
            </KuiCardDescriptionTitle>

            <KuiCardDescriptionText>
              Magnolia trees have broad, waxy leaves which they shed year-round.
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <KuiLinkButton
              buttonType="basic"
              href="https://www.elastic.co/subscriptions/xpack"
              target="_blank"
            >
              Magnolia!
            </KuiLinkButton>
          </KuiCardFooter>
        </KuiCard>
      </KuiCardGroup>

      <br className="guideBreak"/>

      <KuiCardGroup isUnited>
        <KuiCard>
          <KuiCardDescription>
            <KuiCardDescriptionTitle>
              Get a banana
            </KuiCardDescriptionTitle>

            <KuiCardDescriptionText>
              Bananas are yellow, fit easily in the hand, and have a lot of potassium or something.
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <KuiLinkButton
              buttonType="basic"
              href="#"
            >
              Banana!
            </KuiLinkButton>
          </KuiCardFooter>
        </KuiCard>

        <KuiCard>
          <KuiCardDescription>
            <KuiCardDescriptionTitle>
              Get a pteradactyl
            </KuiCardDescriptionTitle>

            <KuiCardDescriptionText>
              Pteradactyls can fly, like to squawk all the time, and are difficult to spell correctly.
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <KuiLinkButton
              buttonType="primary"
              href="https://www.elastic.co/subscriptions/xpack"
              target="_blank"
            >
              Pteradactyl!
            </KuiLinkButton>
          </KuiCardFooter>
        </KuiCard>

        <KuiCard style={cardStyle}>
          <KuiCardDescription>
            <KuiCardDescriptionTitle>
              Get a magnolia tree
            </KuiCardDescriptionTitle>

            <KuiCardDescriptionText>
              Magnolia trees have broad, waxy leaves which they shed year-round.
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <KuiLinkButton
              buttonType="basic"
              href="https://www.elastic.co/subscriptions/xpack"
              target="_blank"
            >
              Magnolia!
            </KuiLinkButton>
          </KuiCardFooter>
        </KuiCard>
      </KuiCardGroup>
    </div>
  );
};
