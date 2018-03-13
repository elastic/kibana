import React from 'react';

import {
  KuiEvent,
  KuiEventSymbol,
  KuiEventBody,
  KuiEventBodyMessage,
  KuiEventBodyMetadata,
  KuiMenu,
  KuiMenuItem,
} from '../../../../components';

export default () => (
  <KuiMenu>
    <KuiMenuItem>
      <KuiEvent>
        <KuiEventSymbol>
          <span className="kuiIcon kuiIcon--error fa-warning" aria-label="Error" role="img"/>
        </KuiEventSymbol>

        <KuiEventBody>
          <KuiEventBodyMessage>
            minimum_master_nodes setting of 1 is less than quorum of 2
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
            Cluster state is red because 17 primary shards are unassigned
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
            Elasticsearch node version mismatches detected: 5.1.0
          </KuiEventBodyMessage>

          <KuiEventBodyMetadata>
            July 27, 2021 11:20:09
          </KuiEventBodyMetadata>
        </KuiEventBody>
      </KuiEvent>
    </KuiMenuItem>
  </KuiMenu>
);
