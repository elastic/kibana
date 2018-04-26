import React from 'react';

import {
  KuiEvent,
  KuiEventSymbol,
  KuiEventBody,
  KuiEventBodyMessage,
  KuiEventBodyMetadata,
  KuiMenu,
  KuiMenuItem,
  KuiHeaderBar,
  KuiHeaderBarSection
} from '../../../../components';

export default () => (
  <div className="kuiView">
    {/* Constrained width, centered content */}
    <div className="kuiViewContent kuiViewContent--constrainedWidth">
      <div className="kuiViewContentItem">

        <KuiHeaderBar>
          <KuiHeaderBarSection>
            <h2 className="kuiSubTitle">
              Cluster of Almonds
            </h2>
          </KuiHeaderBarSection>

          <KuiHeaderBarSection>
            <div className="kuiText">
              <a className="kuiLink" href="#">View all 21 almonds</a>
            </div>
          </KuiHeaderBarSection>
        </KuiHeaderBar>

        <KuiMenu className="kuiVerticalRhythm">
          <KuiMenuItem>
            <KuiEvent>
              <KuiEventSymbol>
                <span className="kuiIcon kuiIcon--info fa-info" aria-label="Info" role="img"/>
              </KuiEventSymbol>

              <KuiEventBody>
                <KuiEventBodyMessage>
                  margarine_masher_toad sitting of 1 is less than opossum of 2
                </KuiEventBodyMessage>

                <KuiEventBodyMetadata>
                  August 4, 2021 02:23:28
                </KuiEventBodyMetadata>
              </KuiEventBody>
            </KuiEvent>
          </KuiMenuItem>

          <KuiMenuItem>
            <KuiEvent>
              <KuiEventSymbol>
                <span className="kuiIcon kuiIcon--error fa-warning" aria-label="Error" role="img"/>
              </KuiEventSymbol>

              <KuiEventBody>
                <KuiEventBodyMessage>
                  Cluster stork is red because 17 pillory stars are unenamored
                </KuiEventBodyMessage>

                <KuiEventBodyMetadata>
                  August 3, 2021 12:00:54
                </KuiEventBodyMetadata>
              </KuiEventBody>
            </KuiEvent>
          </KuiMenuItem>

          <KuiMenuItem>
            <KuiEvent>
              <KuiEventSymbol>
                <span className="kuiIcon kuiIcon--warning fa-bolt" aria-label="Warning" role="img"/>
              </KuiEventSymbol>

              <KuiEventBody>
                <KuiEventBodyMessage>
                  Elastic band nematode vision marshmallow directed: 50,100
                </KuiEventBodyMessage>

                <KuiEventBodyMetadata>
                  July 27, 2021 11:20:09
                </KuiEventBodyMetadata>
              </KuiEventBody>
            </KuiEvent>
          </KuiMenuItem>
        </KuiMenu>
      </div>
    </div>
  </div>
);
