ARG JENKINS_VERSION=lts

FROM jenkins/jenkins:${JENKINS_VERSION} as jenkins
USER root
# Delete big files not needed
RUN mkdir /app && unzip /usr/share/jenkins/jenkins.war -d /app/jenkins && \
  rm -rf /app/jenkins/scripts /app/jenkins/jsbundles /app/jenkins/css /app/jenkins/images /app/jenkins/help /app/jenkins/WEB-INF/detached-plugins /app/jenkins/winstone.jar /app/jenkins/WEB-INF/jenkins-cli.jar /app/jenkins/WEB-INF/lib/jna-4.5.2.jar

FROM openjdk:8-jdk
ENV JENKINS_UC https://updates.jenkins.io
USER root
RUN mkdir -p /app /usr/share/jenkins/ref/plugins
COPY --from=jenkins /app/jenkins /app/jenkins
COPY --from=jenkins /usr/local/bin/install-plugins.sh /usr/local/bin/install-plugins.sh
COPY --from=jenkins /usr/local/bin/jenkins-support /usr/local/bin/jenkins-support
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN /usr/local/bin/install-plugins.sh < /usr/share/jenkins/ref/plugins.txt

ENV JENKINSFILE_RUNNER_VERSION 1.0-beta-8

# User needs to be root for access to mounted Docker socket
# hadolint ignore=DL3002
USER root
RUN curl -O https://repo.jenkins-ci.org/releases/io/jenkins/jenkinsfile-runner/jenkinsfile-runner/$JENKINSFILE_RUNNER_VERSION/jenkinsfile-runner-$JENKINSFILE_RUNNER_VERSION-app.zip && \
  unzip jenkinsfile-runner-$JENKINSFILE_RUNNER_VERSION-app.zip -d /app && \
  rm jenkinsfile-runner-$JENKINSFILE_RUNNER_VERSION-app.zip && \
  chmod +x /app/bin/jenkinsfile-runner

# COPY app/target/appassembler /app

ENTRYPOINT ["/app/bin/jenkinsfile-runner", "-w", "/app/jenkins", "-p", "/usr/share/jenkins/ref/plugins", "--no-sandbox", "-f", "/workspace"]