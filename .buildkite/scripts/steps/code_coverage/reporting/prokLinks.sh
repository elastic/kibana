#!/usr/bin/env bash

set -euo pipefail

cat << EOF > src/dev/code_coverage/www/index_partial_2.html
        <a class="nav-link" href="https://kibana-coverage.elastic.dev/${TIME_STAMP}/jest-combined/index.html">Latest Jest</a>
        <a class="nav-link" href="https://kibana-coverage.elastic.dev/${TIME_STAMP}/functional-combined/index.html">Latest FTR</a>
      </nav>
    </div>
  </header>
  <main role="main" class="inner cover">
    <!--    <h1 class="cover-heading"> - Master Branch</h1>-->
    <p class="lead">Use Kibana Stats to mine coverage data</p>
    <p class="lead">
      <a href="https://kibana-stats.elastic.dev/app/kibana#/dashboard/58b8db70-62f9-11ea-8312-7f2d69b79843?_g=(filters%3A!()%2CrefreshInterval%3A(pause%3A!t%2Cvalue%3A0)%2Ctime%3A(from%3Anow-7d%2Cto%3Anow))" class="btn btn-lg btn-primary">Dashboard</a>
    </p>
  </main>
  <footer class="mastfoot mt-auto">
    <div class="inner">
      <p>Please slack us at <a href="https://app.slack.com/client/T0CUZ52US/C0TR0FAET">#kibana-qa</a> if youve questions</p>
    </div>
  </footer>
</div>
</body>
</html>
EOF

cat src/dev/code_coverage/www/index_partial.html > src/dev/code_coverage/www/index.html
cat src/dev/code_coverage/www/index_partial_2.html >> src/dev/code_coverage/www/index.html