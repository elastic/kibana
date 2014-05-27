FROM cmfatih/nodejs

RUN apt-get install git -y
RUN npm install -g grunt-cli
RUN npm install -g bower
RUN apt-get install wget -y
RUN wget http://go-cli.s3-website-us-east-1.amazonaws.com/releases/latest/cf-cli_amd64.deb && dpkg -i cf-cli_amd64.deb
RUN apt-get install curl -y

VOLUME ["/workspace"]
WORKDIR /workspace